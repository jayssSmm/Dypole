"""
models.py

Loads the trained solar/wind power checkpoints if they exist at
./models/*.pt (relative to this file, i.e. backend/models/), and falls
back to a simple analytic (physics-based) estimator if they don't -- or
if torch itself isn't installed. This means the API is runnable
end-to-end (with clearly-approximate numbers) before real trained
weights are dropped in, and switches to the real models automatically
the moment solar_power_model.pt / wind_power_model.pt appear in the
backend/models/ directory.

Both the real and the fallback path expose the same interface:
    model.predict(feature_vec: list[float]) -> float
    model.predict_with_uncertainty(feature_vec: list[float]) -> (mean, std)
"""

import os

import numpy as np

try:
    import torch
    import torch.nn as nn
    _TORCH_AVAILABLE = True
except ImportError:  # pragma: no cover - only hit in a torch-less env
    _TORCH_AVAILABLE = False

_HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(_HERE, "models")
SOLAR_CKPT_PATH = os.path.join(MODELS_DIR, "solar_power_model.pt")
WIND_CKPT_PATH = os.path.join(MODELS_DIR, "wind_power_model.pt")

_DEVICE = torch.device("cpu") if _TORCH_AVAILABLE else None


# --------------------------------------------------------------------------
# Real model architecture -- must match the training scripts exactly so the
# saved state_dict keys line up. Unified so it can load either a plain
# Linear/ReLU/Dropout checkpoint or a BatchNorm one from the same class.
# --------------------------------------------------------------------------
if _TORCH_AVAILABLE:

    class PowerMLP(nn.Module):
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
    return "net.1.running_mean" in state_dict


class RealModel:
    """Wraps a loaded torch checkpoint behind the shared predict() interface."""

    def __init__(self, ckpt_path):
        try:
            ckpt = torch.load(ckpt_path, map_location=_DEVICE, weights_only=False)
        except TypeError:
            ckpt = torch.load(ckpt_path, map_location=_DEVICE)

        state_dict = ckpt["model_state_dict"]
        first_w = state_dict["net.0.weight"]
        hidden, in_dim = first_w.shape
        use_batchnorm = _detect_batchnorm_architecture(state_dict)

        self.model = PowerMLP(in_dim=in_dim, hidden=hidden, use_batchnorm=use_batchnorm).to(_DEVICE)
        self.model.load_state_dict(state_dict)
        self.model.eval()
        self.ckpt = ckpt
        self.feature_cols = ckpt["feature_cols"]
        self.lags = ckpt.get("lags", [1, 2, 3])

    def _scale(self, feature_vec):
        x = np.asarray(feature_vec, dtype=np.float32).reshape(1, -1)
        x_mean, x_std = self.ckpt["x_mean"], self.ckpt["x_std"]
        return ((x - x_mean) / x_std).astype(np.float32)

    def predict(self, feature_vec):
        x_scaled = self._scale(feature_vec)
        y_mean, y_std = self.ckpt["y_mean"], self.ckpt["y_std"]
        with torch.no_grad():
            pred_scaled = self.model(torch.from_numpy(x_scaled).to(_DEVICE)).cpu().numpy()
        pred = pred_scaled * y_std + y_mean
        return float(pred.reshape(-1)[0])

    def _enable_mc_dropout(self):
        for module in self.model.modules():
            if isinstance(module, nn.Dropout):
                module.train()

    def predict_with_uncertainty(self, feature_vec, n_samples=30):
        x_scaled = torch.from_numpy(self._scale(feature_vec)).to(_DEVICE)
        y_mean, y_std = self.ckpt["y_mean"], self.ckpt["y_std"]

        self.model.eval()
        self._enable_mc_dropout()
        preds = []
        with torch.no_grad():
            for _ in range(n_samples):
                preds.append(self.model(x_scaled).cpu().numpy())
        self.model.eval()

        preds = np.stack(preds).reshape(n_samples)
        preds_unscaled = preds * y_std.reshape(-1)[0] + y_mean.reshape(-1)[0]
        return float(preds_unscaled.mean()), float(preds_unscaled.std())


# --------------------------------------------------------------------------
# Fallback analytic models -- used when there's no trained checkpoint (or
# no torch) available yet, so the rest of the pipeline (dispatch, /status,
# /schedule, the frontend) can be built and demoed before training
# finishes. Swap in real weights and these stop being used automatically.
# --------------------------------------------------------------------------
class FallbackSolarModel:
    """Simple capacity-factor estimate: output scales linearly with global
    horizontal irradiance up to a configurable panel capacity. Clearly an
    approximation, not a trained model -- replace with solar_power_model.pt
    for real predictions."""

    feature_cols = [
        "Total solar irradiance (W/m2)",
        "Direct normal irradiance (W/m2)",
        "Global horizontal irradiance (W/m2)",
        "Air temperature (°C)",
        "Atmosphere (hpa)",
        "Relative humidity (%)",
    ]
    lags = [1, 2, 3]
    PANEL_CAPACITY_KW = 3.0
    STC_IRRADIANCE = 1000.0  # W/m2, standard test condition reference

    def predict(self, feature_vec):
        ghi = feature_vec[self.feature_cols.index("Global horizontal irradiance (W/m2)")]
        capacity_factor = max(0.0, min(1.0, ghi / self.STC_IRRADIANCE))
        return self.PANEL_CAPACITY_KW * capacity_factor

    def predict_with_uncertainty(self, feature_vec, n_samples=30):
        mean = self.predict(feature_vec)
        return mean, mean * 0.1  # flat 10% band, purely illustrative


class FallbackWindModel:
    """Simple cubic power-curve estimate (power ~ wind_speed^3 up to rated
    speed, flat at rated capacity, zero past cut-out). Approximation only
    -- replace with wind_power_model.pt for real predictions."""

    feature_cols = ["wind_speed", "temp", "prs", "hum%"]
    TURBINE_CAPACITY_KW = 2.5
    RATED_SPEED = 12.0  # m/s
    CUT_IN_SPEED = 3.0
    CUT_OUT_SPEED = 25.0

    def predict(self, feature_vec):
        ws = feature_vec[self.feature_cols.index("wind_speed")]
        if ws < self.CUT_IN_SPEED or ws >= self.CUT_OUT_SPEED:
            return 0.0
        fraction = min(1.0, (ws / self.RATED_SPEED) ** 3)
        return self.TURBINE_CAPACITY_KW * fraction

    def predict_with_uncertainty(self, feature_vec, n_samples=30):
        mean = self.predict(feature_vec)
        return mean, mean * 0.15


def load_models():
    """Returns (solar_model, wind_model, using_real_models: bool)."""
    can_load_solar = _TORCH_AVAILABLE and os.path.exists(SOLAR_CKPT_PATH)
    can_load_wind = _TORCH_AVAILABLE and os.path.exists(WIND_CKPT_PATH)

    solar_model = RealModel(SOLAR_CKPT_PATH) if can_load_solar else FallbackSolarModel()
    wind_model = RealModel(WIND_CKPT_PATH) if can_load_wind else FallbackWindModel()

    using_real_models = can_load_solar and can_load_wind
    return solar_model, wind_model, using_real_models
