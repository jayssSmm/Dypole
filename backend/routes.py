"""
routes.py

The microgrid dashboard endpoints. state.py and scheduler.py already
maintain all of this data (AppState.last_status, .last_schedule,
.history, .set_calamity(...)) but nothing previously exposed it over
HTTP -- this module is that missing piece, shaped to match the
mock_data.json structure (mockNormalStatus / mockNormalSchedule / etc.)
the frontend was clearly built against.
"""

from fastapi import APIRouter
from pydantic import BaseModel

import state as st
from scheduler import build_schedule

router = APIRouter(prefix="/api", tags=["microgrid"])


class CalamityRequest(BaseModel):
    active: bool


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
def get_schedule():
    """12-hour forward projection -- shape matches mockNormalSchedule /
    mockBlizzardSchedule. Computed fresh on each call (cheap: one hourly
    forecast fetch + a chained loop), and also cached onto AppState so
    /api/status callers can see the last schedule that was computed."""
    schedule = build_schedule()
    with st.state._lock:
        st.state.last_schedule = schedule
    return schedule


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
