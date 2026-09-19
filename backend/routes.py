"""
routes.py

The microgrid dashboard endpoints. state.py and scheduler.py already
maintain all of this data (AppState.last_status, .last_schedule,
.history, .set_calamity(...)) but nothing previously exposed it over
HTTP -- this module is that missing piece, shaped to match the
mock_data.json structure (mockNormalStatus / mockNormalSchedule / etc.)
the frontend was clearly built against.
"""

from fastapi import APIRouter, HTTPException, Query

import state as st
from UseModel import build_schedule
from backend.UseModel import predict_power, _load_grid_state, _determine_severity, GRID_CONFIG, DEFAULT_SITE_LAT, DEFAULT_SITE_LON

router = APIRouter()

from backend.extension import PredictRequest, CalamityRequest


@router.get("/status")
def get_status():
    """Current battery/diesel/telemetry snapshot -- shape matches
    mockNormalStatus/mockBlizzardStatus plus a telemetry block."""
    snap = st.state.snapshot()
    return {
        **(snap["status"] or {}),
        # Live toggle always wins over the (possibly stale, pre-toggle)
        # severity baked into the last computed status -- set_calamity()
        # takes effect immediately, but last_status only refreshes once
        # per tick (every POLL_INTERVAL_SECONDS).
        "severity": snap["severity"],
        "telemetry": snap["telemetry"],
        "using_real_models": snap["using_real_models"],
        "last_updated": snap["last_updated"],
        "last_error": snap["last_error"],
    }


@router.get("/schedule")
def get_schedule(
    lat: float = Query(DEFAULT_SITE_LAT, description="Latitude (defaults to configured site)"),
    lon: float = Query(DEFAULT_SITE_LON, description="Longitude (defaults to configured site)"),
    is_calamity: bool = Query(False, description="Storm-prep mode: prioritize charging the battery over consumption"),
):
    """12-hour (H+0..H+11) dispatch schedule -- see build_schedule()."""
    try:
        return build_schedule(lat, lon, is_calamity=is_calamity, hours=12)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_history():
    return st.state.snapshot()["history"]


@router.post("/calamity")
def set_calamity(req: CalamityRequest):
    """Toggle the storm-prep / calamity dispatch mode. Takes effect on the
    next tick() (every POLL_INTERVAL_SECONDS) and immediately for any
    /api/schedule call made afterwards."""
    severity = st.state.set_calamity(req.active)
    return {"severity": severity}

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


@router.get("/status")
def get_status():
    """Current microgrid status: battery, diesel health/restock, and an
    overall severity derived from simple thresholds (see
    SEVERITY_THRESHOLDS). See the MICROGRID STATE section above for what's
    real vs. placeholder here."""
    state = _load_grid_state()
    severity = _determine_severity(
        state["battery_kwh"], state["diesel_health"], state["restock_days_remaining"]
    )
    return {
        "severity": severity,
        "battery": {
            "capacity_kwh": GRID_CONFIG["battery_capacity_kwh"],
            "usable_kwh": GRID_CONFIG["battery_usable_kwh"],
            "current_kwh": round(state["battery_kwh"], 2),
            "discharge_kw": round(state.get("last_discharge_kw", 0.0), 2),
        },
        "diesel_health": round(state["diesel_health"], 1),
        "restock_days_remaining": round(state["restock_days_remaining"], 1),
    }


@router.get("/schedule")
def get_schedule(
    lat: float = Query(DEFAULT_SITE_LAT, description="Latitude (defaults to configured site)"),
    lon: float = Query(DEFAULT_SITE_LON, description="Longitude (defaults to configured site)"),
    is_calamity: bool = Query(False, description="Storm-prep mode: prioritize charging the battery over consumption"),
):
    """12-hour (H+0..H+11) dispatch schedule -- see build_schedule()."""
    try:
        return build_schedule(lat, lon, is_calamity=is_calamity, hours=12)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))