#!/usr/bin/env python3
"""
UseModel.py  (originally predict_power.py)

FastAPI service. POST/GET a lat/lon, it fetches current weather (via
weather_api.weather.fetch_current), runs it through the trained solar and
wind power models, fills in the two `None` output placeholders, and
returns the modified dict as JSON.

Both models are autoregressive: they were trained on their *own previous
predictions* as input features -- solar on power_lag_1/2/3, wind on
pow_lag_1/2/3 -- to predict the *next* value. A single live weather
snapshot has no such history on its own, so this script keeps a small
JSON cache on disk (keyed by lat/lon) of each model's last few
predictions and feeds those back in as the lag inputs on the next run.
On the very first run for a given location, lags are bootstrapped to 0.0.

IMPORTANT -- checkpoint feature schema (verified directly from the .pt
files, not assumed):
    solar_power_model.pt feature_cols:
        Total solar irradiance (W/m2), Direct normal irradiance (W/m2),
        Global horizontal irradiance (W/m2), Air temperature (°C),
        Atmosphere (hpa), Relative humidity (%),
        power_lag_1, power_lag_2, power_lag_3
        lags = [1, 2, 3], target_col = "Power (MW)"

    wind_power_model.pt feature_cols:
        wind_speed, temp, prs, hum,
        pow_lag_1, pow_lag_2, pow_lag_3
        lags = [1, 2, 3], target_col = "pow_out"

    Both models use the SAME lag scheme (their own last 3 outputs) --
    there is no wind_speed_sq/wind_speed_cub engineered feature and no
    single-value pow_out_lag in the actual wind checkpoint, despite an
    earlier version of this file assuming that. build_wind_feature_vec()
    below mirrors build_solar_feature_vec()'s history-based approach.

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

*** /status and /schedule added below ***
These reuse the trained solar/wind models above to drive
dispatch_energy() (pasted in verbatim) into the microgrid-status and
12-hour-schedule shapes. Anything about battery/diesel telemetry or an
hourly weather *forecast* (as opposed to the live snapshot fetch_current
gives you) doesn't exist anywhere else in this file, so those pieces are
implemented as clearly-marked placeholder config/heuristics -- see the
"MICROGRID STATE" and "FORECAST HELPERS" sections. Replace them with your
real BMS/diesel-sensor readings and a real hourly weather forecast API
when you have them; the dispatch/endpoint wiring around them will not
need to change.

This file lives at backend/UseModel.py so the relative paths to
../models/*.pt and ./weather_api/weather.py resolve correctly.

Run it (from the project root, via backend/__init__.py:create_app -- see
main.py):
    uvicorn wsgi:app --reload

Then call it:
    GET  http://localhost:8000/predict?lat=28.6&lon=77.2
    GET  http://localhost:8000/predict?lat=28.6&lon=77.2&uncertainty=true
    POST http://localhost:8000/predict   body: {"lat": 28.6, "lon": 77.2}
    GET  http://localhost:8000/status
    GET  http://localhost:8000/schedule
    GET  http://localhost:8000/schedule?is_calamity=true
"""

import json
import math
import os
import random
import sys
from datetime import datetime

import numpy as np
import torch
import torch.nn as nn

from backend.psutils.get_memory_db import get_memory_mb

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
WIND_CUT_OUT_SPEED = 90


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
    for module in model.modules():
        if isinstance(module, nn.Dropout):
            module.train()


def _predict_with_uncertainty(model, ckpt, feature_vec, device, n_samples=30):
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
# Both solar and wind now store a short *history list* of their own past
# predictions (not a single scalar), since both checkpoints use 3-step
# autoregressive lags.
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
    """Defaults missing keys individually so this works whether the cache
    entry is brand new, or an older entry saved before wind switched from
    a single 'wind_pow_out_lag' scalar to a 'wind_power_history' list."""
    key = _cache_key(lat, lon)
    entry = cache.get(key, {})
    return {
        "solar_power_history": entry.get("solar_power_history", []),
        "wind_power_history": entry.get("wind_power_history", []),
    }


def _set_location_state(cache, lat, lon, state):
    cache[_cache_key(lat, lon)] = state


# --------------------------------------------------------------------------
# Feature builders -- order MUST follow ckpt["feature_cols"], since that's
# what x_mean/x_std were fit against. Both solar and wind checkpoints use
# the same "last N of my own past outputs" lag scheme, so these two
# builders are structurally identical -- only the raw-feature fallback
# and the lag key prefix ("power_lag_" vs "pow_lag_") differ.
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


def build_wind_feature_vec(raw, ckpt, pow_history):
    """pow_history: past pow_out predictions, oldest first.
    lag_k = value k steps back; missing history bootstraps to 0.0.

    NOTE: the trained wind_power_model.pt checkpoint's feature_cols are
    ['wind_speed', 'temp', 'prs', 'hum', 'pow_lag_1', 'pow_lag_2',
    'pow_lag_3'] -- confirmed directly from the checkpoint. There is no
    wind_speed_sq/wind_speed_cub engineered feature and no single-value
    pow_out_lag; an earlier version of this function assumed both and
    that's what caused KeyError('hum') plus a feature-vector shape
    mismatch once that was fixed.
    """
    feature_cols = ckpt["feature_cols"]
    lags = ckpt.get("lags", [1, 2, 3])

    lag_values = {
        f"pow_lag_{lag}": (pow_history[-lag] if len(pow_history) >= lag else 0.0)
        for lag in lags
    }

    vec = []
    for col in feature_cols:
        vec.append(lag_values[col] if col in lag_values else raw[col])
    return vec


# --------------------------------------------------------------------------
# Core prediction logic -- unchanged from the CLI version, just no longer
# called from an argparse main().
# --------------------------------------------------------------------------
_DEVICE = torch.device("cpu")

# Models are loaded once per process, not once per request.
_solar_model, _solar_ckpt = None, None
_wind_model, _wind_ckpt = None, None
RAM_USED = None
_models_missing = False


def _ensure_models_loaded():
    global _solar_model, _solar_ckpt, _wind_model, _wind_ckpt, _models_missing
    global RAM_USED
    if _models_missing:
        return
    if not (os.path.exists(SOLAR_CKPT_PATH) and os.path.exists(WIND_CKPT_PATH)):
        # No trained checkpoints dropped into <project root>/models/ yet.
        # Fail loudly but gracefully (503) instead of crashing torch.load.
        _models_missing = True
        return
    
    initial_ram = get_memory_mb()
    if _solar_model is None:
        _solar_model, _solar_ckpt = _load_model(SOLAR_CKPT_PATH, _DEVICE)
    if _wind_model is None:
        _wind_model, _wind_ckpt = _load_model(WIND_CKPT_PATH, _DEVICE)
    final_ram = get_memory_mb()

    RAM_USED = final_ram - initial_ram


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

    wind_vec = build_wind_feature_vec(raw, _wind_ckpt, state["wind_power_history"])
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

    max_solar_lag = max(_solar_ckpt.get("lags", [1, 2, 3]))
    max_wind_lag = max(_wind_ckpt.get("lags", [1, 2, 3]))
    state["solar_power_history"] = (state["solar_power_history"] + [solar_pred])[-max_solar_lag:]
    state["wind_power_history"] = (state["wind_power_history"] + [wind_pred])[-max_wind_lag:]
    _set_location_state(cache, lat, lon, state)
    _save_cache(cache)

    return raw


# ==========================================================================
# UNIT NOTE -- resolved 2026-09: the checkpoint's target column is named
# "Power (MW)", but that label is misleading, not literal. Comparing
# actual model output against the real site (~220 kW total demand)
# shows the model producing values like 59.6 for that same "Power (MW)"
# field -- 59.6 MW from a station whose total load is 220 kW is not
# physically sensible, whereas 59.6 kW from a modest solar array is.
# Conclusion: the training pipeline's column name is wrong (or was
# copied from a template for a different, much larger reference plant);
# the values it actually learned to output are already in kW.
#
# Fix applied below: solar_pred / wind_pred are consumed AS-IS, in kW,
# with no *1000 or /1000 conversion anywhere. Do NOT add a MW->kW
# conversion factor here -- that would make the numbers 1000x too big
# again. If you later get authoritative confirmation from whoever wrote
# train_solar_power_model.py that the target really was megawatts for a
# specific reference plant, this needs a capacity-factor rescale
# instead (predicted/reference_plant_capacity * your_real_capacity) --
# but nothing checked so far supports that; the mislabeling explanation
# fits every sample we've seen.
# ==========================================================================


# ==========================================================================
# DISPATCH ENGINE -- pasted in as provided. Priority for normal mode is
# solar+wind -> battery -> diesel; calamity mode routes renewables to
# charge the battery first, using any leftover to offset consumption
# before diesel does.
# ==========================================================================
def dispatch_energy(consumption, solar, wind, battery_charge, battery_capacity, is_calamity=False, result=None):
    """
    Dispatch decision for a microgrid with solar, wind, diesel, and battery.

    Normal mode priority: solar+wind -> battery -> diesel (diesel assumed always sufficient)
    Calamity mode priority: solar+wind -> battery charging is the goal; diesel covers
                             consumption; any renewable left after battery is full
                             still offsets consumption before diesel does.

    Parameters:
        consumption (float): required load (x)
        solar (float): solar production
        wind (float): wind production
        battery_charge (float): current battery charge level
        battery_capacity (float): max battery capacity
        is_calamity (bool): True if in storm-prep mode

    Returns:
        dict with renewable_used, battery_used, battery_charged,
        diesel_used, curtailed, new_battery_charge
    """
    if not result:
        result = {
            "renewable_used": 0.0,
            "battery_used": 0.0,
            "battery_charged": 0.0,
            "diesel_used": 0.0,
            "curtailed": 0.0,
            "new_battery_charge": battery_charge,
        }

    renewable_total = solar + wind

    if not is_calamity:
        if renewable_total >= consumption:
            # Renewables cover it fully; excess goes to battery (capped), rest curtailed
            result["renewable_used"] = consumption
            excess = renewable_total - consumption
            room = battery_capacity - battery_charge
            charged = min(excess, room)
            result["battery_charged"] = charged
            result["curtailed"] = excess - charged
            result["new_battery_charge"] = battery_charge + charged
        else:
            # Renewables fall short; battery covers the gap; diesel covers the rest
            result["renewable_used"] = renewable_total
            deficit = consumption - renewable_total
            drawn = min(deficit, battery_charge)
            result["battery_used"] = drawn
            result["diesel_used"] = deficit - drawn
            result["new_battery_charge"] = battery_charge - drawn

    else:
        # Calamity: renewables prioritize charging the battery
        room = battery_capacity - battery_charge
        charged = min(renewable_total, room)
        result["battery_charged"] = charged
        result["new_battery_charge"] = battery_charge + charged

        leftover_renewable = renewable_total - charged
        renewable_to_consumption = min(leftover_renewable, consumption)
        result["renewable_used"] = renewable_to_consumption
        result["diesel_used"] = consumption - renewable_to_consumption
        result["curtailed"] = leftover_renewable - renewable_to_consumption

    return result


# ==========================================================================
# MICROGRID STATE (battery / diesel) -- config, persistence, severity
#
# None of this comes from the solar/wind models above; it's operational
# grid state that nothing in this file previously tracked. There's no
# real BMS/diesel-sensor feed wired in yet, so:
#   - GRID_CONFIG's capacity/usable-kWh numbers are your battery spec --
#     set them to the real values once (they were only guessed here to
#     match your example payload).
#   - diesel_health and restock_days_remaining are tracked as *persisted,
#     heuristically-decayed* numbers (decremented by simulated diesel
#     burn each time /schedule runs) rather than real sensor readings.
#     Swap _load_grid_state/_save_grid_state for your real telemetry
#     source when you have one -- everything downstream just reads
#     grid_state["battery_kwh"] / ["diesel_health"] / ["restock_days_remaining"].
# ==========================================================================
GRID_STATE_PATH = os.path.join(_HERE, ".grid_state.json")

GRID_CONFIG = {
    # NOTE: rescaled from the earlier mock-scale numbers (battery_capacity
    # 5.4 kWh) to match the real load figure (~220 kW). A 5.4 kWh battery
    # would fully drain in under two minutes against a 220 kW load, which
    # is what was producing the nonsense schedule (battery hit 0 by hour
    # 2, diesel maxed out immediately). These are still placeholders --
    # replace with your BESS's real capacity/usable-kWh spec -- but
    # they're now at least the right order of magnitude for this load.
    "battery_capacity_kwh": 200.0,
    "battery_usable_kwh": 150.0,
    "battery_initial_kwh": 100.0,
    "diesel_health_initial": 78.0,      # 0-100 -- placeholder; wire to a real genset health metric
    "diesel_restock_days_initial": 4.0,  # placeholder; wire to a real tank-level sensor / consumption log
    # Also rescaled: these were tuned assuming diesel_kw in the 0-4 range
    # (mock scale). At real ~100+ kW diesel dispatch they'd zero out
    # diesel_health / restock_days_remaining in a single /schedule call.
    "diesel_health_wear_per_kwh": 0.0005,  # % health lost per kWh of diesel burned -- placeholder heuristic, tune to your genset
    "diesel_daily_ration_kwh": 800.0,       # assumed kWh/day diesel budget used to burn down restock_days -- placeholder, set to your genset's real daily fuel budget
}

SEVERITY_THRESHOLDS = {
    "battery_low_frac": 0.2,   # of usable_kwh
    "diesel_health_low": 40.0,
    "restock_days_low": 1.5,
}

DEFAULT_SITE_LAT = 28.6   # placeholder -- set to your microgrid's actual site coordinates
DEFAULT_SITE_LON = 77.2

DEMAND_TARGET_KW = 220.0  # real load requirement, as given
DEMAND_NOISE_KW = 10.0    # +/- random noise per hour, as given

GRID_CONFIG_VERSION = 2  # bump whenever battery/diesel scale constants change

def _default_grid_state():
    return {
        "_config_version": GRID_CONFIG_VERSION,
        "battery_kwh": GRID_CONFIG["battery_initial_kwh"],
        "diesel_health": GRID_CONFIG["diesel_health_initial"],
        "restock_days_remaining": GRID_CONFIG["diesel_restock_days_initial"],
        "last_discharge_kw": 0.0,
    }

def _load_grid_state():
    if not os.path.exists(GRID_STATE_PATH):
        return _default_grid_state()
    try:
        with open(GRID_STATE_PATH, "r") as f:
            state = json.load(f)
        if state.get("_config_version") != GRID_CONFIG_VERSION:
            # scale/config changed since this file was written -- stale, reset
            return _default_grid_state()
        defaults = _default_grid_state()
        defaults.update(state)
        return defaults
    except (json.JSONDecodeError, OSError):
        return _default_grid_state()

def _save_grid_state(state):
    with open(GRID_STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)


def _determine_severity(battery_kwh, diesel_health, restock_days_remaining):
    usable = GRID_CONFIG["battery_usable_kwh"]
    if (
        diesel_health < SEVERITY_THRESHOLDS["diesel_health_low"]
        or restock_days_remaining < SEVERITY_THRESHOLDS["restock_days_low"]
    ):
        return "critical"
    if battery_kwh < usable * SEVERITY_THRESHOLDS["battery_low_frac"]:
        return "warning"
    return "normal"


# ==========================================================================
# FORECAST HELPERS (for /schedule)
#
# weather_api.weather only exposes fetch_current -- a single live
# snapshot, not an hourly forecast -- so there is no real forecast data
# source available here. The functions below build a 12-hour renewable
# and demand forecast out of that one live reading using simple, clearly
# labeled heuristics:
#   - solar: a clear-sky diurnal bell curve (zero outside ~6am-6pm),
#     scaled by how far today's live irradiance sits below/above a clear
#     sky at the current hour ("cloud_factor"), then run through the
#     actual trained solar model each hour, autoregressing off its own
#     prior forecasted hour just like predict_power() does.
#   - wind: held at the current live reading (persistence), run through
#     the actual trained wind model each hour with the same
#     autoregression scheme.
#   - demand: 220 kW +/- random(0, 10) kW per hour, per the real load
#     figure -- no diurnal shape applied since none was given; add one
#     later if the real load actually varies by time of day.
# Replace with a real hourly weather-forecast API (e.g. Open-Meteo's
# hourly endpoint) and real load data when available; nothing else in
# /schedule needs to change if you keep the same return shape.
# ==========================================================================
_CLEAR_SKY_PEAKS = {
    "Total solar irradiance (W/m2)": 1000.0,
    "Direct normal irradiance (W/m2)": 850.0,
    "Global horizontal irradiance (W/m2)": 950.0,
}


def _daylight_fraction(hour_of_day):
    if 6 <= hour_of_day <= 18:
        return math.sin(math.pi * (hour_of_day - 6) / 12)
    return 0.0


def _forecast_renewable_inputs(raw_now, hours=12):
    """Returns a list of dicts, one per forecast hour, each with a
    synthetic 'solar_raw' weather dict (irradiance columns scaled for
    that hour) and a 'wind_speed' value. See module-level note above."""
    now_hour = datetime.now().hour
    now_frac = _daylight_fraction(now_hour)

    cloud_factor = 1.0
    if now_frac > 0.05:
        ghi_now = raw_now.get("Global horizontal irradiance (W/m2)", 0.0) or 0.0
        clear_sky_now = _CLEAR_SKY_PEAKS["Global horizontal irradiance (W/m2)"] * now_frac
        if clear_sky_now > 0:
            cloud_factor = max(0.0, min(1.3, ghi_now / clear_sky_now))

    forecast = []
    for h in range(hours):
        hour_of_day = (now_hour + h) % 24
        frac = _daylight_fraction(hour_of_day)
        solar_raw = dict(raw_now)
        for col, peak in _CLEAR_SKY_PEAKS.items():
            solar_raw[col] = round(peak * frac * cloud_factor, 1)
        forecast.append({
            "hour_of_day": hour_of_day,
            "solar_raw": solar_raw,
            "wind_speed": raw_now.get("wind_speed", 0.0),
        })
    return forecast


def _forecast_demand_kw(hour_of_day):
    """Real load requirement: 220 kW +/- random(0, 10) kW per hour.
    hour_of_day is accepted but unused -- no diurnal shape was specified;
    replace this with a real load forecast/meter feed when available."""
    return DEMAND_TARGET_KW + random.uniform(-DEMAND_NOISE_KW, DEMAND_NOISE_KW)


def _explain_dispatch(d, is_calamity):
    if is_calamity:
        if d["diesel_used"] == 0 and d["battery_charged"] > 0:
            return "Calamity mode: renewables charging battery; leftover renewable output covers demand"
        if d["diesel_used"] > 0 and d["battery_charged"] > 0:
            return "Calamity mode: renewables prioritized to charge battery; diesel covers remaining demand"
        return "Calamity mode: battery full or empty of renewable input; diesel covers demand"
    if d["diesel_used"] == 0 and d["battery_used"] == 0:
        if d["curtailed"] > 0:
            return "Solar and wind cover demand with surplus charging the battery; excess curtailed"
        if d["battery_charged"] > 0:
            return "Solar and wind cover demand; surplus charges the battery"
        return "Solar and wind cover demand; baseline zero-diesel preserved"
    if d["diesel_used"] == 0 and d["battery_used"] > 0:
        return "Renewables fall short; battery covers the deficit"
    if d["diesel_used"] > 0 and d["battery_used"] > 0:
        return "Battery and diesel jointly cover the renewable shortfall"
    return "Battery depleted; diesel covers the shortfall"


def build_schedule(lat, lon, is_calamity=False, hours=12):
    """Runs the 12-hour dispatch loop and persists the resulting
    battery/diesel state. Returns the list of hourly schedule dicts."""
    raw_now = fetch_current(lat, lon)
    global RAM_USED

    _ensure_models_loaded()
    if _models_missing:
        raise RuntimeError(
            "Trained checkpoints not found under <project root>/models/ "
            "(solar_power_model.pt, wind_power_model.pt)."
        )

    power_cache = _load_cache()
    loc_state = _get_location_state(power_cache, lat, lon)
    solar_hist = list(loc_state["solar_power_history"])
    wind_hist = list(loc_state["wind_power_history"])
    max_solar_lag = max(_solar_ckpt.get("lags", [1, 2, 3]))
    max_wind_lag = max(_wind_ckpt.get("lags", [1, 2, 3]))

    grid_state = _load_grid_state()
    battery_kwh = grid_state["battery_kwh"]

    hourly_inputs = _forecast_renewable_inputs(raw_now, hours=hours)

    schedule = []
    for h, hour_info in enumerate(hourly_inputs):
        solar_vec = build_solar_feature_vec(hour_info["solar_raw"], _solar_ckpt, solar_hist)
        solar_pred = _predict(_solar_model, _solar_ckpt, solar_vec, _DEVICE)
        solar_pred = apply_solar_physics_floor(solar_pred, hour_info["solar_raw"])
        solar_hist = (solar_hist + [solar_pred])[-max_solar_lag:]

        wind_raw_hour = dict(raw_now)
        wind_raw_hour["wind_speed"] = hour_info["wind_speed"]
        wind_vec = build_wind_feature_vec(wind_raw_hour, _wind_ckpt, wind_hist)
        wind_pred = _predict(_wind_model, _wind_ckpt, wind_vec, _DEVICE)
        wind_pred = apply_wind_cutout_ceiling(wind_pred, wind_raw_hour)
        wind_hist = (wind_hist + [wind_pred])[-max_wind_lag:]

        solar_kw = max(solar_pred, 0.0)
        wind_kw = max(wind_pred, 0.0)
        demand_kw = _forecast_demand_kw(hour_info["hour_of_day"])

        dispatch = dispatch_energy(
            consumption=demand_kw,
            solar=solar_kw,
            wind=wind_kw,
            battery_charge=battery_kwh,
            battery_capacity=GRID_CONFIG["battery_capacity_kwh"],
            is_calamity=is_calamity,
        )

        battery_kwh = dispatch["new_battery_charge"]
        net_battery_kw = dispatch["battery_charged"] - dispatch["battery_used"]  # + charging, - discharging

        schedule.append({
            "hour": h,
            "diesel_kw": round(dispatch["diesel_used"], 3),
            "solar_kw": round(solar_kw, 3),
            "wind_kw": round(wind_kw, 3),
            "battery_kw": round(net_battery_kw, 3),
            "demand_kw": round(demand_kw, 3),
            "battery_soc_after": round(battery_kwh, 3),
            "reason": _explain_dispatch(dispatch, is_calamity),
            "RAM_USED":RAM_USED
        })

    # NOTE: this GET has side effects (like the existing /predict does) --
    # it advances the persisted lag history and burns down diesel
    # health/restock based on this forecast's total diesel usage.
    _set_location_state(power_cache, lat, lon, {
        "solar_power_history": solar_hist,
        "wind_power_history": wind_hist,
    })
    _save_cache(power_cache)

    total_diesel_kwh = sum(item["diesel_kw"] for item in schedule)
    grid_state["battery_kwh"] = battery_kwh
    grid_state["diesel_health"] = max(
        0.0, grid_state["diesel_health"] - total_diesel_kwh * GRID_CONFIG["diesel_health_wear_per_kwh"]
    )
    grid_state["restock_days_remaining"] = max(
        0.0, grid_state["restock_days_remaining"] - total_diesel_kwh / GRID_CONFIG["diesel_daily_ration_kwh"]
    )
    grid_state["last_discharge_kw"] = abs(schedule[0]["battery_kw"]) if schedule[0]["battery_kw"] < 0 else 0.0
    _save_grid_state(grid_state)

    return schedule