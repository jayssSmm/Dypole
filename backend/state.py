"""
state.py

Central configuration and in-memory application state for the microgrid
service. One process, one station -- so a simple module-level singleton
with a lock is enough; no need for a database for this scope.

Clearly split into two kinds of fields, called out inline:
  - REAL: derived directly from the weather API + trained/fallback ML
    models + the dispatch decision layer.
  - SIMULATED: there's no actual generator/battery-management-system
    telemetry feed wired up yet, so these evolve via a small, documented
    approximation so the dashboard has something plausible to show end
    to end. Swap update_telemetry() for a real sensor read whenever that
    feed exists.
"""

import math
import random
import threading
from datetime import datetime, timezone

# --------------------------------------------------------------------------
# Static config -- tune freely, nothing else in the app hardcodes these.
# --------------------------------------------------------------------------
LAT = -78.15
LON = 16.40

POLL_INTERVAL_SECONDS = 15 * 60
SCHEDULE_HOURS = 12
HISTORY_MAX_ENTRIES = 500

BATTERY_CAPACITY_KWH = 5.4
USABLE_FRACTION = 2.6 / 5.4  # matches the "usable_kwh" seen in the mock data
BATTERY_INITIAL_KWH = 3.3

DIESEL_HEALTH_INITIAL = 78.0
DIESEL_HEALTH_DECAY_PER_RUN_HOUR = 0.01  # % lost per hour the genset runs

FUEL_TANK_CAPACITY_LITERS = 27_000.0
FUEL_RESERVE_INITIAL_LITERS = 14_200.0
FUEL_BURN_RATE_L_PER_KWH = 0.32  # typical small-genset diesel consumption

RUNNING_HOURS_INITIAL = 4120.4
SERVICE_INTERVAL_HOURS = 4500.0

BUS_FREQUENCY_NOMINAL_HZ = 50.0
PEAK_CAPACITY_KW = 280.0  # station nameplate, static display value

# Demand (load) profile -- there's no load-metering feed wired up, so this
# is a simple diurnal curve with an offset in emergency mode, matching the
# rough magnitude of the mock data (~3.0-3.6 kW normal, ~4.4-5.6 kW storm).
DEMAND_BASE_KW = 3.2
DEMAND_DAILY_SWING_KW = 0.4
DEMAND_PEAK_HOUR_UTC = 14
DEMAND_EMERGENCY_OFFSET_KW = 1.8


def estimate_demand_kw(hour_utc: float, severity: str) -> float:
    """REAL-ish: a configurable placeholder load curve, not a live meter.
    Swap this out the moment there's an actual demand/load sensor feed."""
    base = DEMAND_BASE_KW + DEMAND_DAILY_SWING_KW * math.sin(
        2 * math.pi * (hour_utc - DEMAND_PEAK_HOUR_UTC) / 24
    )
    if severity == "emergency":
        base += DEMAND_EMERGENCY_OFFSET_KW
    return round(max(0.0, base), 2)


class AppState:
    """Thread-safe container for everything the API routes read and the
    scheduler writes."""

    def __init__(self):
        self._lock = threading.Lock()

        self.severity = "normal"  # "normal" | "emergency" -- the calamity toggle
        self.battery_charge_kwh = BATTERY_INITIAL_KWH

        # Autoregressive lag state for the two ML models (see models.py /
        # scheduler.py) -- bootstraps to 0.0 on first run, same as the
        # original CLI cache did.
        self.solar_power_history = []
        self.wind_pow_out_lag = 0.0

        self.diesel_health = DIESEL_HEALTH_INITIAL
        self.fuel_reserve_liters = FUEL_RESERVE_INITIAL_LITERS
        self.running_hours = RUNNING_HOURS_INITIAL
        self.recent_daily_burn_liters = []  # rolling window for restock-days estimate

        self.telemetry = {
            "ambientTemp": None,
            "windSpeed": None,
            "windDir": None,
            "syncLatency": 42,
            "busFrequency": BUS_FREQUENCY_NOMINAL_HZ,
            "peakCapacity": PEAK_CAPACITY_KW,
            "solarElevation": None,
            "katabaticWindProj": None,
            "internalCellTemp": 12.0,
            "healthCycleIndex": 98.0,
            "fuelReservePct": round(100 * FUEL_RESERVE_INITIAL_LITERS / FUEL_TANK_CAPACITY_LITERS, 1),
            "fuelReserveLiters": FUEL_RESERVE_INITIAL_LITERS,
            "runningHours": RUNNING_HOURS_INITIAL,
            "serviceRemainHours": SERVICE_INTERVAL_HOURS - (RUNNING_HOURS_INITIAL % SERVICE_INTERVAL_HOURS),
            "exhaustTemp": 300,
        }

        self.last_status = None
        self.last_schedule = []
        self.history = []
        self.last_updated = None
        self.last_error = None
        self.using_real_models = False

        # Set once at startup by main.py via set_models(); kept as plain
        # attributes (not behind the lock) since they're assigned once
        # and read-only afterwards.
        self._solar_model = None
        self._wind_model = None

    def set_models(self, solar_model, wind_model, using_real_models):
        self._solar_model = solar_model
        self._wind_model = wind_model
        self.using_real_models = using_real_models

    def update_lag_state(self, solar_pred, wind_pred, max_solar_lag):
        with self._lock:
            self.solar_power_history = (self.solar_power_history + [solar_pred])[-max_solar_lag:]
            self.wind_pow_out_lag = wind_pred

    def get_lag_state(self):
        with self._lock:
            return list(self.solar_power_history), self.wind_pow_out_lag

    def set_calamity(self, active: bool):
        with self._lock:
            self.severity = "emergency" if active else "normal"
        return self.severity

    def snapshot(self):
        """Read-consistent copy of everything the API needs to serve."""
        with self._lock:
            return {
                "severity": self.severity,
                "battery_charge_kwh": self.battery_charge_kwh,
                "diesel_health": self.diesel_health,
                "telemetry": dict(self.telemetry),
                "status": self.last_status,
                "schedule": list(self.last_schedule),
                "history": list(self.history),
                "last_updated": self.last_updated,
                "last_error": self.last_error,
                "using_real_models": self.using_real_models,
            }

    def apply_tick(self, dispatch_result, raw_weather, interval_hours):
        """Called once per scheduler tick with the outcome of one dispatch
        cycle. Updates battery, fuel/diesel bookkeeping (REAL, tied to
        actual diesel_used), and the simulated instrumentation fields."""
        with self._lock:
            self.battery_charge_kwh = dispatch_result["new_battery_charge"]

            diesel_used_kw = dispatch_result["diesel_used"]
            # REAL: fuel mass-balance and running-hours are derived
            # directly from diesel_used, not simulated.
            liters_burned = diesel_used_kw * interval_hours * FUEL_BURN_RATE_L_PER_KWH
            self.fuel_reserve_liters = max(0.0, self.fuel_reserve_liters - liters_burned)
            if diesel_used_kw > 0:
                self.running_hours += interval_hours
                self.diesel_health = max(
                    0.0, self.diesel_health - DIESEL_HEALTH_DECAY_PER_RUN_HOUR * interval_hours
                )

            self.recent_daily_burn_liters.append(liters_burned * (24 / interval_hours))
            self.recent_daily_burn_liters = self.recent_daily_burn_liters[-24:]

            usable_kwh = min(self.battery_charge_kwh, BATTERY_CAPACITY_KWH * USABLE_FRACTION)
            default_daily_burn = FUEL_BURN_RATE_L_PER_KWH * DEMAND_BASE_KW * 24
            avg_daily_burn = (
                sum(self.recent_daily_burn_liters) / len(self.recent_daily_burn_liters)
                if self.recent_daily_burn_liters else 0.0
            )
            # If diesel hasn't actually run recently the rolling average is
            # ~0 -- fall back to a nominal estimate so restock_days_remaining
            # stays a usable number instead of flapping to None.
            effective_burn = avg_daily_burn if avg_daily_burn > 0.01 else default_daily_burn
            restock_days_remaining = round(self.fuel_reserve_liters / effective_burn, 1)

            # SIMULATED: no BMS/generator instrumentation feed exists yet.
            # These evolve from real inputs (ambient temp, discharge rate,
            # diesel load) plus small jitter, purely for a plausible demo.
            ambient = raw_weather["Air temperature (°C)"]
            wind_speed = raw_weather["wind_speed"]
            self.telemetry.update({
                "ambientTemp": round(ambient, 1),
                "windSpeed": round(wind_speed, 1),
                "windDir": raw_weather.get("wind_direction_compass"),
                "solarElevation": round(raw_weather.get("_solar_elevation", 0.0), 1),
                "katabaticWindProj": round(wind_speed * 1.08 + random.uniform(-2, 2), 1),
                "syncLatency": max(10, round(self.telemetry["syncLatency"] + random.uniform(-6, 6))),
                "busFrequency": round(
                    BUS_FREQUENCY_NOMINAL_HZ + (diesel_used_kw / 20.0) * random.uniform(-1, 1) * 0.1, 2
                ),
                "internalCellTemp": round(
                    12.0 + 0.15 * dispatch_result["battery_used"] - 0.05 * ambient + random.uniform(-0.3, 0.3), 1
                ),
                "healthCycleIndex": round(max(80.0, self.telemetry["healthCycleIndex"] - 0.001), 2),
                "fuelReservePct": round(100 * self.fuel_reserve_liters / FUEL_TANK_CAPACITY_LITERS, 1),
                "fuelReserveLiters": round(self.fuel_reserve_liters, 1),
                "runningHours": round(self.running_hours, 1),
                "serviceRemainHours": round(
                    SERVICE_INTERVAL_HOURS - (self.running_hours % SERVICE_INTERVAL_HOURS), 1
                ),
                "exhaustTemp": round(300 + diesel_used_kw * 35 + random.uniform(-5, 5)),
            })

            self.last_status = {
                "severity": self.severity,
                "battery": {
                    "capacity_kwh": BATTERY_CAPACITY_KWH,
                    "usable_kwh": round(usable_kwh, 2),
                    "current_kwh": round(self.battery_charge_kwh, 2),
                    "discharge_kw": round(dispatch_result["battery_used"], 2),
                },
                "diesel_health": round(self.diesel_health, 1),
                "restock_days_remaining": restock_days_remaining,
            }

            self.last_updated = datetime.now(timezone.utc).isoformat()
            self.last_error = None

            self.history.append({
                "time": self.last_updated,
                "status": self.last_status,
                "dispatch": dispatch_result,
            })
            self.history = self.history[-HISTORY_MAX_ENTRIES:]


state = AppState()
