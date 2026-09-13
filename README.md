# Maitri Polar SCADA Telemetry Hub (DyPole Microgrid Control)

> **Enterprise-Grade Polar Microgrid SCADA Dashboard** for Antarctic Research Station Operations (Maitri Antarctic Station Microgrid, 70°46'S 11°44'E).

---

## 🌟 Key Features

- **⚡ Real-Time Telemetry & Dispatch Optimization**: Live monitoring of Wind Turbines, Bifacial Solar PV Arrays, Battery Energy Storage Systems (BESS), and Backup Diesel Generation.
- **📈 24-Hour Predictive Load Modeling**: Continuous AI load forecasting with 95.4% confidence intervals, peak thresholds, and katabatic wind projection.
- **🔋 BESS Cell Degradation vs Time**: State of Health (SOH) retention curves, Equivalent Full Cycle (EFC) budgeting, anode SEI growth, and projected 80% EOL (End of Life) forecasting under sub-zero polar thermal stress.
- **☀️ PV Silicon Degradation vs Time**: N-Type TOPCon monocrystalline wafer efficiency degradation, Light-Induced Degradation (LID) tracking, Antarctic snow albedo rear-gain boost (+14.8%), and 25-year warranty compliance.
- **🎨 Customization & Theme Studio**:
  - **Custom Dashboard Background**: Drag & drop or pick any custom JPG/JPEG/PNG image with auto-downscaling, dark dimming overlay slider (0–95%), and frosted glass blur (0–20px).
  - **Custom Station Brand Logo**: Upload custom station badges (JPG/JPEG/PNG) with live in-header preview and station name/tagline customization.
  - **Tile & Header Glass Controls**: Full control over tile/card background fill colors, opacity (10–100%), glass blur, header transparency, and accent glow colors.
  - **1-Click Theme Presets**: *Cyber SCADA (Default)*, *Polar Obsidian*, *Ultra Glass Frosted*, *Emerald Aurora*, *Solar Flare Amber*, and *Midnight Deep Blue*.
  - **Persistent Local Storage**: All branding, themes, and wallpaper settings persist across refreshes via `localStorage`.
- **🚨 Priority Operational Alerts & Event Journal**: Real-time event log with severity badges, restock countdowns, and instant Katabatic storm emergency override toggle.
- **📊 72-Hour Historical Matrix & 12-Hour Forward Schedule**: Stacked power source allocation charts and newest-first AI dispatch decision ledger.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** / **pnpm**

### 1. Install & Launch Frontend
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

The dashboard runs **100% standalone** out of the box with instant scenario switchers:
- **`MOCK NORMAL`**: 92% renewable baseline, high solar & wind generation, optimal battery autonomy, nominal status.
- **`MOCK BLIZZARD`**: Emergency katabatic blizzard scenario, 0% solar, forced diesel generation, critical storm alerts.

---

### 2. Optional: Run Local HTTP Mock Server
To test live HTTP polling against `GET /status` and `GET /schedule` on `http://localhost:8000`:
```bash
npm run mock:server
```
Endpoints provided:
- `GET http://localhost:8000/status`
- `GET http://localhost:8000/schedule`

---

### 3. Connecting to Production / Staging Backend API
Create or edit `.env` in the project root:
```env
VITE_API_BASE_URL=http://your-backend-api-host:8000
```
Then select the **LIVE API** toggle in the scenario controls bar. The frontend automatically polls `/status` and `/schedule` every **30 seconds** (configurable via `POLL_INTERVAL_MS` in `src/services/api.ts`).

---

## 🛠️ Data Contract & Telemetry Specifications

### `GET /status`
```json
{
  "severity": "normal",
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

### `GET /schedule` (12 Hourly Objects: `H+0` to `H+11`)
```json
[
  {
    "hour": 0,
    "diesel_kw": 0.0,
    "solar_kw": 2.1,
    "wind_kw": 1.4,
    "battery_kw": 0.0,
    "demand_kw": 3.0,
    "battery_soc_after": 3.3,
    "reason": "Solar and wind cover demand; baseline zero-diesel preserved"
  }
]
```

### Update Frequency
- **Telemetry & Status Polling**: Every **30 seconds**.
- **Schedule Horizon Roll**: Steps forward every **1 hour (60 minutes)** in real time, while solver predictions refresh every 30s poll cycle.

---

## 📁 Project Architecture

```
HH Frontend/
├── src/
│   ├── components/
│   │   ├── AlertBanner.tsx               # Priority alerts & live event journal
│   │   ├── AllocationTimeline.tsx        # Decision reasoning log (newest-first)
│   │   ├── AppearanceModal.tsx           # Wallpaper, logo & tile style studio
│   │   ├── BatteryCard.tsx               # BESS storage array & SOC segmented meter
│   │   ├── BESSCellDegradationCard.tsx   # Battery SOH & capacity fade vs time
│   │   ├── DiagnosticsView.tsx           # Subsystem health & telemetry diagnostics
│   │   ├── DieselHealthCard.tsx          # Diesel gen health & fuel reserve
│   │   ├── Header.tsx                    # Branding, UTC clock, status & customize trigger
│   │   ├── LoadForecastChart.tsx         # 24H predictive energy & confidence interval
│   │   ├── PVSiliconDegradationCard.tsx  # PV silicon wafer efficiency fade vs time
│   │   ├── ScenarioControls.tsx          # Normal/Blizzard/Live API switcher
│   │   ├── ScheduleMatrixChart.tsx       # 72H history / 12H schedule stacked area
│   │   ├── SourceMixCard.tsx             # Generation dispatch donut chart
│   │   └── StationSubheader.tsx          # Polar ops badges & subview navigation
│   ├── hooks/
│   │   └── useAppearance.ts              # Appearance state & localStorage persistence
│   ├── mock/
│   │   └── mockData.ts                   # Realistic polar microgrid simulation data
│   ├── services/
│   │   └── api.ts                        # HTTP client with automatic fallback & polling
│   ├── types/
│   │   └── index.ts                      # TypeScript data contracts & telemetry models
│   ├── utils/
│   │   ├── colorUtils.ts                 # Hex/RGB conversion & theme swatches
│   │   └── imageUtils.ts                 # HTML5 canvas image optimizer & downscaler
│   ├── App.tsx                           # Master dashboard layout & CSS variables
│   ├── index.css                         # Glassmorphism design system tokens
│   └── main.tsx                          # React DOM entrypoint
├── mock-server.js                        # Standalone Node.js HTTP mock API server
├── tailwind.config.js                    # Tailwind styling configuration
├── vite.config.ts                        # Vite bundler build config
└── package.json                          # Dependencies and scripts
```

---

## 🏗️ Production Build & Verification

```bash
# Typecheck and compile optimized production bundle
npm run build

# Preview the production build locally
npm run preview
```

### Production Build Outputs:
- Zero TypeScript warnings or compilation errors.
- Gzip-compressed assets with clean code chunking.
- Full responsive support for mobile, tablet, desktop, and ultra-wide SCADA monitoring displays.

---

## 📄 License
Internal Operations SCADA — Antarctic Polar Operations & Microgrid Control.
