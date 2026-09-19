"""
scheduler.py

Three things happen here:

1. tick() -- the live 15-minute cycle. Fetches current weather, runs both
   ML models (autoregressive, using the running lag state in AppState),
   applies the physics floors/ceilings, runs the dispatch decision layer
   against the real battery state, and commits everything to AppState.

2. build_schedule() -- an on-demand forward projection for the next
   SCHEDULE_HOURS hours. Pulls one hourly-forecast weather call (not
   SCHEDULE_HOURS separate live calls), chains the same
   model -> dispatch pipeline hour by hour, but against a *copy* of the
   current battery/lag state so it never mutates the real, persisted
   state. This is a forecast, not a replay of what will actually happen
   once real weather arrives each hour -- it's only as good as the
   weather forecast and the constant demand-curve assumption.

3. run_forever() -- background loop that calls tick() every
   POLL_INTERVAL_SECONDS. Started once from the FastAPI startup hook in
   backend/__init__.py; without this nothing ever calls tick() and
   AppState.last_status stays None forever.
"""

import asyncio
from datetime import datetime, timezone

import state as st
import weather_api.weather as weather
from dispatch import dispatch_energy
from safety import (
    check_in_distribution,
    apply_solar_physics_floor,
    apply_wind_cutout_ceiling,
)


def _build_solar_feature_vec(raw, model, power_history):
    lag_values = {
        f"power_lag_{lag}": (power_history[-lag] if len(power_history) >= lag else 0.0)
        for lag in model.lags
    }
    return [lag_values[col] if col in lag_values else raw[col] for col in model.feature_cols]


def _build_wind_feature_vec(raw, model, pow_out_lag):
    ws = raw["wind_speed"]
    vec = []
    for col in model.feature_cols:
        if col == "pow_out_lag":
            vec.append(pow_out_lag)
        elif col == "wind_speed_sq":
            vec.append(ws ** 2)
        elif col == "wind_speed_cub":
            vec.append(ws ** 3)
        else:
            vec.append(raw[col])
    return vec


def _run_one_cycle(raw, solar_model, wind_model, power_history, pow_out_lag,
                    battery_charge_kwh, severity, hour_utc):
    """One weather-snapshot -> prediction -> dispatch cycle. Pure function
    of its inputs (no shared-state mutation) so it can be reused for both
    the live tick and the forecast chain."""
    ood_warnings = check_in_distribution(raw)

    solar_vec = _build_solar_feature_vec(raw, solar_model, power_history)
    solar_pred = solar_model.predict(solar_vec)
    solar_pred = apply_solar_physics_floor(solar_pred, raw)

    wind_vec = _build_wind_feature_vec(raw, wind_model, pow_out_lag)
    wind_pred = wind_model.predict(wind_vec)
    wind_pred = apply_wind_cutout_ceiling(wind_pred, raw)

    is_calamity = severity == "emergency"
    demand_kw = st.estimate_demand_kw(hour_utc, severity)

    dispatch_result = dispatch_energy(
        consumption=demand_kw,
        solar=solar_pred,
        wind=wind_pred,
        battery_charge=battery_charge_kwh,
        battery_capacity=st.BATTERY_CAPACITY_KWH,
        is_calamity=is_calamity,
    )

    return {
        "solar_pred": solar_pred,
        "wind_pred": wind_pred,
        "demand_kw": demand_kw,
        "dispatch": dispatch_result,
        "warnings": ood_warnings,
    }


def _reason_for(cycle, severity):
    d = cycle["dispatch"]
    if severity == "emergency":
        if d["diesel_used"] > 0.05:
            return "Calamity mode: renewables charging battery, diesel covers load"
        return "Calamity mode: renewables covering load and charging battery"
    if d["diesel_used"] > 0.05:
        return "Battery reserve depleted; diesel covering shortfall"
    if d["battery_used"] > 0.05:
        return "Solar and wind short of demand; battery covering the gap"
    if d["battery_charged"] > 0.05:
        return "Solar and wind exceed demand; surplus charging battery"
    return "Solar and wind cover demand"


def _tick_sync():
    """The live 15-minute cycle body. Synchronous/blocking (the weather
    call uses `requests`) -- always invoke via tick(), which runs this in
    a worker thread so it never stalls the event loop."""
    try:
        raw = weather.fetch_current(st.LAT, st.LON)
        raw["_solar_elevation"] = weather.solar_elevation_deg(st.LAT, st.LON)
    except Exception as exc:
        with st.state._lock:
            st.state.last_error = str(exc)
        return

    power_history, pow_out_lag = st.state.get_lag_state()
    hour_utc = datetime.now(timezone.utc).hour + datetime.now(timezone.utc).minute / 60

    cycle = _run_one_cycle(
        raw, st.state._solar_model, st.state._wind_model,
        power_history, pow_out_lag,
        st.state.battery_charge_kwh, st.state.severity, hour_utc,
    )

    max_lag = max(getattr(st.state._solar_model, "lags", [1, 2, 3]))
    st.state.update_lag_state(cycle["solar_pred"], cycle["wind_pred"], max_lag)

    interval_hours = st.POLL_INTERVAL_SECONDS / 3600
    st.state.apply_tick(cycle["dispatch"], raw, interval_hours)

    if cycle["warnings"]:
        with st.state._lock:
            st.state.last_error = "; ".join(cycle["warnings"])


async def tick():
    """Async wrapper around _tick_sync(), off the event loop thread."""
    await asyncio.to_thread(_tick_sync)


async def run_forever():
    """Background loop: tick() once, then every POLL_INTERVAL_SECONDS.
    Started as an asyncio task from the FastAPI startup hook. Errors from
    a single tick are already captured onto state.last_error inside
    _tick_sync, so a bad tick doesn't kill the loop."""
    while True:
        await asyncio.sleep(st.POLL_INTERVAL_SECONDS)
        await tick()
