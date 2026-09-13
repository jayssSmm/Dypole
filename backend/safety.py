"""
safety.py

Out-of-distribution warnings and hard physics constraints applied to
every model prediction, live or forecast. Unchanged in spirit from the
original CLI script this project grew out of.
"""

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

WIND_CUT_OUT_SPEED = 25.0


def check_in_distribution(raw, ranges=WEATHER_VALID_RANGES):
    """Human-readable warnings for any raw weather value outside the
    ranges used to clean the training data."""
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
