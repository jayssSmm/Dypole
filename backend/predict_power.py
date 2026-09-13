#!/usr/bin/env python3
"""
predict_power.py

FastAPI service. POST/GET a lat/lon, it fetches current weather (via
weather_api.weather.fetch_current), runs it through the trained solar and
wind power models, fills in the two `None` output placeholders, and
returns the modified dict as JSON.

Both models are autoregressive: they were trained on the *previous* power
reading as an input feature (power_lag_1/2/3 for solar, pow_out_lag for
wind), predicting the *next* one. A single live weather snapshot has no
such history on its own, so this script keeps a small JSON cache on disk
(keyed by lat/lon) of the last predictions and feeds those back in as the
lag inputs on the next run. On the very first run for a given location,
lags are bootstrapped to 0.0.

OOD safety (unchanged from the CLI version):
    1. check_in_distribution() -- flags any raw input feature that falls
       outside the same sanity ranges the two training scripts used to
       DROP rows during cleaning. Warnings are attached to the response
       under "_warnings" instead of silently trusting an extrapolated
       number.
    2. apply_solar_physics_floor() -- solar output is hard-clamped to 0.0
       whenever all three irradiance features are <= 0 (night).
    3. apply_wind_cutout_ceiling() -- wind output is hard-clamped to 0.0
       once wind_speed reaches/exceeds a cut-out threshold.
    4. predict_with_uncertainty() -- optional MC-dropout uncertainty
       estimate (mean + std over several stochastic forward passes).

NOTE: this is the original CLI-derived, self-contained endpoint. It keeps
its own lag cache/model-loading independent of backend/state.py +
backend/models.py (which power the live microgrid /api/status and
/api/schedule routes). If solar_power_model.pt / wind_power_model.pt
don't exist yet under <project root>/models/, this router's /predict
endpoint will return a 503 rather than crash the whole app -- see
_ensure_models_loaded().

This file lives at backend/predict_power.py so the relative paths to
../models/*.pt and ./weather_api/weather.py resolve correctly.

Run it (from the project root, via backend/__init__.py:create_app -- see
main.py):
    uvicorn main:app --host 0.0.0.0 --port 8000

Then call it:
    GET  http://localhost:8000/predict?lat=28.6&lon=77.2
    GET  http://localhost:8000/predict?lat=28.6&lon=77.2&uncertainty=true
    POST http://localhost:8000/predict   body: {"lat": 28.6, "lon": 77.2}
"""

import json
import os
import sys

import numpy as np
import torch
import torch.nn as nn
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# --------------------------------------------------------------------------
# Wire up to weather_api/weather.py (fetch_current + the shared column
# name constants), assuming this script lives alongside that folder.
#
# NOTE: the fix here vs. the original draft -- we insert THIS file's own
# directory (backend/) onto sys.path, not backend/weather_api/. Inserting
# the weather_api/ folder itself would make `import weather_api.weather`
# look for backend/weather_api/weather_api/weather.py, which doesn't
# exist and would ImportError at startup.
# --------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from weather_api.weather import (  # noqa: E402
    fetch_current,
    TARGET_COL,       # "Power (MW)"        -- solar output key
    POW_TARGET_COL,   # "pow_out"           -- wind output key
)

_HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(_HERE, "..", "models")
SOLAR_CKPT_PATH = os.path.join(MODELS_DIR, "solar_power_model.pt")
WIND_CKPT_PATH = os.path.join(MODELS_DIR, "wind_power_model.pt")

CACHE_PATH = os.path.join(_HERE, ".pow_lag_cache.json")


# --------------------------------------------------------------------------
# Sanity ranges -- MUST stay in sync with VALID_RANGES in
# train_solar_power_model.py and train_wind_power_model.py.
# --------------------------------------------------------------------------
WEATHER_VALID_RANGES = {
    # wind-model raw feature names
    "wind_speed": (0, 60),
    "temp": (-60, 55),
    "prs": (800, 1100),
    "hum%": (0, 100),
    # solar-model raw feature names
    "Total solar irradiance (W/m2)": (0, 1500),
    "Direct normal irradiance (W/m2)": (0, 1500),
    "Global horizontal irradiance (W/m2)": (0, 1500),
    "Air temperature (°C)": (-40, 60),
    "Atmosphere (hpa)": (800, 1100),
    "Relative humidity (%)": (0, 100),
}

SOLAR_IRRADIANCE_COLS = [
    "Total solar irradiance (W/m2)",
    "Direct normal irradiance (W/m2)",
    "Global horizontal irradiance (W/m2)",
]

# Typical utility-scale turbine cut-out speed. Tune to your actual turbine
# spec if you have per-file capacity/model info available.
WIND_CUT_OUT_SPEED = 25.0


def check_in_distribution(raw, ranges=WEATHER_VALID_RANGES):
    """Return a list of human-readable warnings for any raw weather value
    that falls outside the ranges used to clean the training data."""
    warnings = []
    for col, (lo, hi) in ranges.items():
        if col not in raw:
            continue
        v = raw[col]
        if v is None:
            continue
        if (lo is not None and v < lo) or (hi is not None and v > hi):
            warnings.append(f"{col}={v} is outside training range [{lo}, {hi}]")
    return warnings


def apply_solar_physics_floor(pred, raw):
    """Hard physics constraint: no sunlight in -> no power out."""
    irradiance_vals = [raw.get(c) for c in SOLAR_IRRADIANCE_COLS]
    if all(v is not None and v <= 0 for v in irradiance_vals):
        return 0.0
    return pred


def apply_wind_cutout_ceiling(pred, raw, cutout=WIND_CUT_OUT_SPEED):
    """Hard physics constraint: turbines feather/shut down at high wind
    speed for safety."""
    ws = raw.get("wind_speed")
    if ws is not None and ws >= cutout:
        return 0.0
    return pred


# --------------------------------------------------------------------------
# Model architectures -- must match the two training scripts exactly so
# the saved state_dict keys line up.
# --------------------------------------------------------------------------
class PowerMLP(nn.Module):
    """Unified MLP whose layout is chosen to match what a checkpoint was
    actually trained with:
      - use_batchnorm=False -> Linear/ReLU/Dropout only ("v1" layout)
      - use_batchnorm=True  -> BatchNorm1d after every hidden Linear ("v2" layout)
    Layer indices are built to line up exactly with both original classes,
    so state_dict keys (net.0, net.1, ...) still match either checkpoint.
    """

    def __init__(self, in_dim, hidden=128, use_batchnorm=False, dropout=0.1):
        super().__init__()
        layers = []

        def block(in_f, out_f, with_dropout=True):
            layers.append(nn.Linear(in_f, out_f))
            if use_batchnorm:
                layers.append(nn.BatchNorm1d(out_f))
            layers.append(nn.ReLU())
            if with_dropout:
                layers.append(nn.Dropout(dropout))

        block(in_dim, hidden)
        block(hidden, hidden)
        block(hidden, hidden // 2, with_dropout=False)
        layers.append(nn.Linear(hidden // 2, 1))

        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


def _detect_batchnorm_architecture(state_dict):
    """BatchNorm1d layers save running_mean/running_var; a plain
    Linear/ReLU/Dropout stack never has a 'net.1.running_mean' key."""
    return "net.1.running_mean" in state_dict


def _load_model(ckpt_path, device):
    try:
        ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    except TypeError:
        ckpt = torch.load(ckpt_path, map_location=device)

    state_dict = ckpt["model_state_dict"]
    first_w = state_dict["net.0.weight"]  # shape: [hidden, in_dim]
    hidden, in_dim = first_w.shape
    use_batchnorm = _detect_batchnorm_architecture(state_dict)

    model = PowerMLP(in_dim=in_dim, hidden=hidden, use_batchnorm=use_batchnorm).to(device)
    model.load_state_dict(state_dict)
    model.eval()
    return model, ckpt


def _predict(model, ckpt, feature_vec, device):
    """feature_vec: 1D sequence in the exact order of ckpt['feature_cols'].
    Scales with the checkpoint's saved x/y mean+std, runs the model, and
    returns the un-scaled scalar prediction."""
    x = np.asarray(feature_vec, dtype=np.float32).reshape(1, -1)
    x_mean, x_std = ckpt["x_mean"], ckpt["x_std"]
    y_mean, y_std = ckpt["y_mean"], ckpt["y_std"]

    x_scaled = ((x - x_mean) / x_std).astype(np.float32)
    with torch.no_grad():
        # BatchNorm layers are safe on a batch of 1 in eval mode -- they
        # use running stats, not batch stats.
        pred_scaled = model(torch.from_numpy(x_scaled).to(device))
    pred_scaled = pred_scaled.cpu().numpy()
    pred = pred_scaled * y_std + y_mean
    return float(pred.reshape(-1)[0])


def _enable_mc_dropout(model):
    """Flip ONLY Dropout layers into train mode; everything else (notably
    BatchNorm) stays in eval mode so it keeps using its saved running
    stats. Calling plain model.train() would also put BatchNorm into
    training mode, which computes stats from the current batch -- and
    crashes on a batch of size 1 (a single live prediction) with
    'Expected more than 1 value per channel when training'."""
    for module in model.modules():
        if isinstance(module, nn.Dropout):
            module.train()


def _predict_with_uncertainty(model, ckpt, feature_vec, device, n_samples=30):
    """Same as _predict, but runs n_samples stochastic forward passes with
    dropout left active to get a cheap mean/std estimate. Safe for
    BatchNorm architectures at batch size 1 -- see _enable_mc_dropout."""
    x = np.asarray(feature_vec, dtype=np.float32).reshape(1, -1)
    x_mean, x_std = ckpt["x_mean"], ckpt["x_std"]
    y_mean, y_std = ckpt["y_mean"], ckpt["y_std"]
    x_scaled = torch.from_numpy(((x - x_mean) / x_std).astype(np.float32)).to(device)

    model.eval()          # BatchNorm (if any) uses running stats
    _enable_mc_dropout(model)  # ...but Dropout layers still sample
    preds = []
    with torch.no_grad():
        for _ in range(n_samples):
            preds.append(model(x_scaled).cpu().numpy())
    model.eval()  # restore fully clean eval state for subsequent normal predictions

    preds = np.stack(preds).reshape(n_samples)
    preds_unscaled = preds * y_std.reshape(-1)[0] + y_mean.reshape(-1)[0]
    return float(preds_unscaled.mean()), float(preds_unscaled.std())


# --------------------------------------------------------------------------
# Lag cache -- one entry per (lat, lon), bootstraps to 0.0 on first run.
# --------------------------------------------------------------------------
def _cache_key(lat, lon):
    return f"{lat:.4f}_{lon:.4f}"


def _load_cache():
    if not os.path.exists(CACHE_PATH):
        return {}
    try:
        with open(CACHE_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_cache(cache):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2)


def _get_location_state(cache, lat, lon):
    key = _cache_key(lat, lon)
    return cache.get(key, {"solar_power_history": [], "wind_pow_out_lag": 0.0})


def _set_location_state(cache, lat, lon, state):
    cache[_cache_key(lat, lon)] = state


# --------------------------------------------------------------------------
# Feature builders -- order MUST follow ckpt["feature_cols"], since that's
# what x_mean/x_std were fit against.
# --------------------------------------------------------------------------
def build_solar_feature_vec(raw, ckpt, power_history):
    """power_history: past Power (MW) predictions, oldest first.
    lag_k = value k steps back; missing history bootstraps to 0.0."""
    feature_cols = ckpt["feature_cols"]
    lags = ckpt.get("lags", [1, 2, 3])

    lag_values = {
        f"power_lag_{lag}": (power_history[-lag] if len(power_history) >= lag else 0.0)
        for lag in lags
    }

    vec = []
    for col in feature_cols:
        vec.append(lag_values[col] if col in lag_values else raw[col])
    return vec


def build_wind_feature_vec(raw, ckpt, pow_out_lag):
    feature_cols = ckpt["feature_cols"]  # base weather + pow_out_lag + ws^2 + ws^3
    ws = raw["wind_speed"]

    vec = []
    for col in feature_cols:
        if col == "pow_out_lag":
            vec.append(pow_out_lag)
        elif col == "wind_speed_sq":
            vec.append(ws ** 2)
        elif col == "wind_speed_cub":
            vec.append(ws ** 3)
        else:
            vec.append(raw[col])
    return vec


# --------------------------------------------------------------------------
# Core prediction logic -- unchanged from the CLI version, just no longer
# called from an argparse main().
# --------------------------------------------------------------------------
_DEVICE = torch.device("cpu")

# Models are loaded once per process, not once per request.
_solar_model, _solar_ckpt = None, None
_wind_model, _wind_ckpt = None, None
_models_missing = False


def _ensure_models_loaded():
    global _solar_model, _solar_ckpt, _wind_model, _wind_ckpt, _models_missing
    if _models_missing:
        return
    if not (os.path.exists(SOLAR_CKPT_PATH) and os.path.exists(WIND_CKPT_PATH)):
        # No trained checkpoints dropped into <project root>/models/ yet.
        # Fail loudly but gracefully (503) instead of crashing torch.load.
        _models_missing = True
        return
    if _solar_model is None:
        _solar_model, _solar_ckpt = _load_model(SOLAR_CKPT_PATH, _DEVICE)
    if _wind_model is None:
        _wind_model, _wind_ckpt = _load_model(WIND_CKPT_PATH, _DEVICE)


def predict_power(lat, lon, device=None, estimate_uncertainty=False):
    device = device or _DEVICE
    _ensure_models_loaded()
    if _models_missing:
        raise RuntimeError(
            "Trained checkpoints not found under <project root>/models/ "
            "(solar_power_model.pt, wind_power_model.pt). Drop them in, "
            "or use the microgrid /api/status endpoint, which runs on the "
            "analytic fallback models instead."
        )

    raw = fetch_current(lat, lon)

    # OOD check happens on the raw weather reading, before any prediction
    # is trusted -- if training would have dropped this row, we say so.
    ood_warnings = check_in_distribution(raw)

    cache = _load_cache()
    state = _get_location_state(cache, lat, lon)

    solar_vec = build_solar_feature_vec(raw, _solar_ckpt, state["solar_power_history"])
    solar_pred = _predict(_solar_model, _solar_ckpt, solar_vec, device)
    solar_pred = apply_solar_physics_floor(solar_pred, raw)

    wind_vec = build_wind_feature_vec(raw, _wind_ckpt, state["wind_pow_out_lag"])
    wind_pred = _predict(_wind_model, _wind_ckpt, wind_vec, device)
    wind_pred = apply_wind_cutout_ceiling(wind_pred, raw)

    raw[TARGET_COL] = solar_pred
    raw[POW_TARGET_COL] = wind_pred

    if ood_warnings:
        raw["_warnings"] = ood_warnings

    if estimate_uncertainty:
        _, solar_std = _predict_with_uncertainty(_solar_model, _solar_ckpt, solar_vec, device)
        _, wind_std = _predict_with_uncertainty(_wind_model, _wind_ckpt, wind_vec, device)
        raw["_uncertainty"] = {
            f"{TARGET_COL}_std": solar_std,
            f"{POW_TARGET_COL}_std": wind_std,
        }

    max_lag = max(_solar_ckpt.get("lags", [1, 2, 3]))
    state["solar_power_history"] = (state["solar_power_history"] + [solar_pred])[-max_lag:]
    state["wind_pow_out_lag"] = wind_pred
    _set_location_state(cache, lat, lon, state)
    _save_cache(cache)

    return raw


# --------------------------------------------------------------------------
# API layer -- FastAPI, no argparse.
# --------------------------------------------------------------------------
router = APIRouter()


class PredictRequest(BaseModel):
    lat: float
    lon: float
    uncertainty: bool = False


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/predict")
def predict_get(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    uncertainty: bool = Query(False, description="Also return MC-dropout uncertainty"),
):
    try:
        return predict_power(lat, lon, estimate_uncertainty=uncertainty)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
def predict_post(req: PredictRequest):
    try:
        return predict_power(req.lat, req.lon, estimate_uncertainty=req.uncertainty)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
