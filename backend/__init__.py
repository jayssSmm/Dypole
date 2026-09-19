import asyncio
import os
import sys

# scheduler.py / routes.py / state.py / dispatch.py / safety.py /
# weather_api/weather.py all use bare, non-package-qualified imports
# (e.g. `import state as st`, `from dispatch import dispatch_energy`,
# `import weather_api.weather as weather`) written as if this backend/
# directory were itself the top of sys.path. Rather than rewrite every
# one of those imports, we put backend/ on sys.path once here, at
# package-import time, so they all resolve.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import router as microgrid_router          # /api/status, /api/schedule, /api/history, /api/calamity


def create_app():
    app = FastAPI(title="Solar + Wind Power Prediction API")

    app.include_router(microgrid_router)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def _startup():
        import state as st
        from models import load_models
        import scheduler as sch

        solar_model, wind_model, using_real = load_models()
        st.state.set_models(solar_model, wind_model, using_real)

        # Populate AppState immediately so /api/status has data before the
        # first POLL_INTERVAL_SECONDS elapses, then hand the recurring
        # cadence off to a background task.
        await sch.tick()
        asyncio.create_task(sch.run_forever())

    return app