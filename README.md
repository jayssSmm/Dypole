# Maitri Power Control (DyPole SCADA Telemetry Hub)

Polar Microgrid Telemetry & Power Dispatch Control Dashboard for Antarctic Research Station Operations.

## 🚀 Quick Start

### 1. Run the Frontend (Standalone Mock Mode Enabled)
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

The dashboard runs **100% standalone** out of the box with built-in scenario toggles:
- **MOCK NORMAL**: 92% renewable, high solar & wind generation, optimal battery autonomy, normal status.
- **MOCK BLIZZARD**: Emergency katabatic blizzard scenario, 0% solar, diesel generation dispatched, critical storm alerts.

---

### 2. Optional: Run the Local JSON/HTTP Mock Server
If you want to test live HTTP polling against `GET /status` and `GET /schedule` on `http://localhost:8000`:
```bash
npm run mock:server
```
Endpoints provided:
- `GET http://localhost:8000/status`
- `GET http://localhost:8000/schedule`

---

### 3. Connecting to Real Backend API
Set the `VITE_API_BASE_URL` in `.env` or pass it in your environment:
```env
VITE_API_BASE_URL=http://your-real-backend:8000
```
Then select the **LIVE API** toggle in the dashboard control bar. The app will automatically poll `/status` and `/schedule` every **30 seconds** (configurable in `src/services/api.ts`).

---

## 🛠️ Data Contract Reference

### `GET /status`
```json
{
  "severity": "normal" | "warning" | "emergency",
  "battery": {
    "capacity_kwh": 5.4,
    "usable_kwh": 2.6,
    "current_kwh": 3.3,
    "discharge_kw": 1.1
  },
  "diesel_health": 78,
  "restock_days_remaining": 4
}
```

### `GET /schedule` (12 hourly objects)
```json
[
  {
    "hour": 0,
    "diesel_kw": 0,
    "solar_kw": 2.1,
    "wind_kw": 1.4,
    "battery_kw": 0,
    "demand_kw": 3.0,
    "battery_soc_after": 3.3,
    "reason": "Solar and wind cover demand"
  }
]
```

---

## 🧩 Modular Components
- `SourceMixCard.tsx`: Current Generation Dispatch Donut chart with Wind, Solar PV, BESS, and Diesel breakdown.
- `LoadForecastChart.tsx`: 24-Hour Predictive Energy Modeling (Actual vs Forecasted Load) with 95.4% Confidence Interval and threshold markers.
- `BatteryCard.tsx`: BESS Storage Array with segmented State of Charge (SOC) meter and run autonomy calculator.
- `DieselHealthCard.tsx`: Diesel Gen health index, 30-day erosion sparkline, and fuel reserve tracking.
- `AlertBanner.tsx`: Priority Operational Alerts & live event journal with timestamped tags (`T-10M`, `T-1H 12M`, etc.).
- `ScheduleMatrixChart.tsx`: Stacked area/bar telemetry matrix color-coded by source (warm amber diesel, cool cyan/blue solar/wind/battery).
- `AllocationTimeline.tsx`: Timestamped dispatch decision log showing newest-first reason strings.





## 🎛️ Edge Node Firmware Layer (ESP32 + FreeRTOS)

To ensure high-precision telemetry sampling without blocking system execution, the firmware was built natively using **FreeRTOS** on the ESP32 microcontroller within the Arduino ecosystem. 

### 🛠️ Embedded Tech Stack
*   **Hardware Platform:** ESP32 (Dual-Core Tensilica LX6)
*   **Execution Architecture:** FreeRTOS (Real-Time Operating System)
*   **Development Environment:** Arduino IDE

### 🏗️ Firmware Architecture & Multitasking Logic
Instead of a standard, fragile `void loop()`, the firmware decouples system operations into deterministic, independent tasks managed by the FreeRTOS scheduler:

1. **Telemetry Sampling Task (Priority 2):** High-frequency task dedicated to reading raw physical sensor signals (simulating Microgrid Battery SoC, Solar, and Wind generation inputs).
2. **Data Serialization Task (Priority 1):** Periodically wakes up to structuralize raw data variables into a packed JSON payload, directly matching the backend SCADA `GET /status` schema contracts.

### 🔗 Architecture Expansion (Future Scope)
While currently operating as an isolated edge device for local verification, the firmware is architected to scale. The next iteration will spin up a third concurrent FreeRTOS task running on Core 0 to dispatch these JSON data streams over Wi-Fi via an HTTP POST client or MQTT broker directly to the active Node.js backend.

