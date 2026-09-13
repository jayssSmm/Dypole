"""
weather_api/weather.py

Weather data source for the microgrid app. Talks to Open-Meteo
(https://open-meteo.com), a free forecast API that needs no API key, and
maps its fields onto the raw feature-name schema the rest of this
codebase (UseModel.py, scheduler.py, safety.py, models.py) already
expects:

    "wind_speed"                              m/s, at 10m
    "temp"                                    deg C  (wind-model copy)
    "prs"                                     hPa    (wind-model copy)
    "hum%"                                    %      (wind-model copy, legacy name)
    "hum"                                     %      (wind-model copy, name the
                                                        trained wind checkpoint's
                                                        feature_cols actually uses)
    "Total solar irradiance (W/m2)"
    "Direct normal irradiance (W/m2)"
    "Global horizontal irradiance (W/m2)"
    "Air temperature (°C)"                    deg C  (solar-model copy)
    "Atmosphere (hpa)"                        hPa    (solar-model copy)
    "Relative humidity (%)"                   %      (solar-model copy)
    "wind_direction_compass"                  e.g. "NNE"

(The wind and solar training data used separately-named temp/pressure/
humidity columns, so both copies are populated from the same underlying
reading here. "hum" and "hum%" are both included as aliases of the same
value -- the trained wind_power_model.pt checkpoint's feature_cols was
saved as "hum" without the percent sign, so that's the key
build_wind_feature_vec() actually looks up; "hum%" is kept too since
WEATHER_VALID_RANGES / OOD checks and any older code still reference it.)

If the live API call fails for any reason (no network egress, DNS
failure, timeout, rate limit, ...), fetch_current()/fetch_hourly() fall
back to a small deterministic/synthetic weather model so the app keeps
running end-to-end (useful in sandboxes and offline dev). This mirrors
the same real-model/fallback-model pattern already used in models.py.
Look at `raw["_source"]` ("live" vs "synthetic-fallback") to tell which
one produced a given reading.
"""

import math
from datetime import datetime, timedelta, timezone

import requests

TARGET_COL = "Power (MW)"
POW_TARGET_COL = "pow_out"

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT_SECONDS = 8

_COMPASS_POINTS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
]


def _compass(deg):
    if deg is None:
        return None
    idx = round(deg / 22.5) % 16
    return _COMPASS_POINTS[idx]


def solar_elevation_deg(lat, lon, when=None):
    """Sun elevation angle in degrees above the horizon (negative = below,
    i.e. night) using the standard solar-position formula. `when` defaults
    to now (UTC)."""
    when = when or datetime.now(timezone.utc)

    day_of_year = when.timetuple().tm_yday
    decl = math.radians(23.45) * math.sin(math.radians(360 / 365 * (day_of_year - 81)))

    hour_decimal = when.hour + when.minute / 60 + when.second / 3600
    # Solar time correction via longitude only (no equation-of-time term;
    # good enough for the OOD/physics-floor use this value is put to).
    solar_time = hour_decimal + lon / 15.0
    hour_angle = math.radians(15 * (solar_time - 12))

    lat_rad = math.radians(lat)
    elevation = math.asin(
        math.sin(lat_rad) * math.sin(decl)
        + math.cos(lat_rad) * math.cos(decl) * math.cos(hour_angle)
    )
    return math.degrees(elevation)


def _synthetic_reading(lat, lon, when):
    """Deterministic, physically-plausible stand-in reading for when the
    live API can't be reached. Not real weather -- purely keeps the
    prediction/dispatch/telemetry pipeline runnable offline."""
    elevation = solar_elevation_deg(lat, lon, when)
    is_day = elevation > 0

    ghi = max(0.0, 900.0 * math.sin(math.radians(max(elevation, 0)))) if is_day else 0.0
    dni = ghi * 0.85
    tsi = ghi * 1.05

    day_of_year = when.timetuple().tm_yday
    seasonal = 10 * math.sin(math.radians(360 / 365 * (day_of_year - 172)))  # peak ~ midsummer
    ambient_temp = -20.0 + seasonal + 8 * math.sin(math.radians(15 * when.hour))

    wind_speed = 8.0 + 4.0 * math.sin(math.radians(15 * when.hour + lon))
    wind_dir_deg = (200 + 20 * math.sin(math.radians(15 * when.hour))) % 360

    hum = 55.0

    return {
        "wind_speed": round(max(0.0, wind_speed), 2),
        "temp": round(ambient_temp, 2),
        "prs": 970.0,
        "hum%": hum,
        "hum": hum,
        "Total solar irradiance (W/m2)": round(tsi, 1),
        "Direct normal irradiance (W/m2)": round(dni, 1),
        "Global horizontal irradiance (W/m2)": round(ghi, 1),
        "Air temperature (°C)": round(ambient_temp, 2),
        "Atmosphere (hpa)": 970.0,
        "Relative humidity (%)": hum,
        "wind_direction_compass": _compass(wind_dir_deg),
        "_source": "synthetic-fallback",
    }


def fetch_current(lat, lon):
    """Current weather reading as a flat dict keyed the way the trained
    models expect. Raises nothing on API failure -- falls back to
    _synthetic_reading() instead, so callers only need to handle actual
    programming errors."""
    now = datetime.now(timezone.utc)
    try:
        resp = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "current": ",".join([
                    "temperature_2m",
                    "relative_humidity_2m",
                    "surface_pressure",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "shortwave_radiation",
                    "direct_radiation",
                    "diffuse_radiation",
                ]),
                "timezone": "UTC",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        cur = resp.json()["current"]

        ghi = cur.get("shortwave_radiation") or 0.0
        dni = cur.get("direct_radiation") or 0.0
        diffuse = cur.get("diffuse_radiation") or 0.0
        tsi = ghi + diffuse  # rough total-irradiance proxy

        temp = cur["temperature_2m"]
        prs = cur["surface_pressure"]
        hum = cur["relative_humidity_2m"]

        return {
            "wind_speed": cur["wind_speed_10m"],
            "temp": temp,
            "prs": prs,
            "hum%": hum,
            "hum": hum,
            "Total solar irradiance (W/m2)": tsi,
            "Direct normal irradiance (W/m2)": dni,
            "Global horizontal irradiance (W/m2)": ghi,
            "Air temperature (°C)": temp,
            "Atmosphere (hpa)": prs,
            "Relative humidity (%)": hum,
            "wind_direction_compass": _compass(cur.get("wind_direction_10m")),
            "_source": "live",
        }
    except Exception:
        return _synthetic_reading(lat, lon, now)


def fetch_hourly(lat, lon, hours=12):
    """List of `hours` hourly readings starting at the current hour, same
    schema as fetch_current(). Falls back to the synthetic generator
    (one synthetic reading per forecast hour) on any API failure."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    try:
        resp = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": ",".join([
                    "temperature_2m",
                    "relative_humidity_2m",
                    "surface_pressure",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "shortwave_radiation",
                    "direct_radiation",
                    "diffuse_radiation",
                ]),
                "forecast_hours": hours,
                "timezone": "UTC",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        h = resp.json()["hourly"]

        readings = []
        for i in range(min(hours, len(h["time"]))):
            ghi = h["shortwave_radiation"][i] or 0.0
            dni = h["direct_radiation"][i] or 0.0
            diffuse = h["diffuse_radiation"][i] or 0.0
            tsi = ghi + diffuse
            temp = h["temperature_2m"][i]
            prs = h["surface_pressure"][i]
            hum = h["relative_humidity_2m"][i]

            readings.append({
                "wind_speed": h["wind_speed_10m"][i],
                "temp": temp,
                "prs": prs,
                "hum%": hum,
                "hum": hum,
                "Total solar irradiance (W/m2)": tsi,
                "Direct normal irradiance (W/m2)": dni,
                "Global horizontal irradiance (W/m2)": ghi,
                "Air temperature (°C)": temp,
                "Atmosphere (hpa)": prs,
                "Relative humidity (%)": hum,
                "wind_direction_compass": _compass(h["wind_direction_10m"][i]),
                "_solar_elevation": solar_elevation_deg(lat, lon, now + timedelta(hours=i)),
                "_source": "live",
            })
        if readings:
            return readings
        raise ValueError("empty hourly response")
    except Exception:
        return [
            {**_synthetic_reading(lat, lon, now + timedelta(hours=i)),
             "_solar_elevation": solar_elevation_deg(lat, lon, now + timedelta(hours=i))}
            for i in range(hours)
        ]