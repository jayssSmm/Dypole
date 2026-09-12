import { StatusResponse, ScheduleResponse, TelemetryMetrics } from '../types';

export const mockNormalStatus: StatusResponse = {
  severity: "normal",
  battery: {
    capacity_kwh: 540.0,
    usable_kwh: 432.0,
    current_kwh: 388.0,
    discharge_kw: 32.0,
  },
  diesel_health: 78,
  restock_days_remaining: 4,
};

// Normal consumption: 220 ± rand(0-10) kW (range 210 - 230 kW)
export const mockNormalSchedule: ScheduleResponse = [
  { hour: 0, diesel_kw: 0.0, solar_kw: 95.0, wind_kw: 124.0, battery_kw: 0.0, demand_kw: 219.0, battery_soc_after: 72.5, reason: "Solar (95kW) and Wind (124kW) fully cover 219kW station demand; zero-diesel maintained" },
  { hour: 1, diesel_kw: 0.0, solar_kw: 108.0, wind_kw: 118.0, battery_kw: 0.0, demand_kw: 224.0, battery_soc_after: 75.0, reason: "Surplus renewable generation (+2kW) routed to BESS storage charging buffer" },
  { hour: 2, diesel_kw: 0.0, solar_kw: 122.0, wind_kw: 105.0, battery_kw: 0.0, demand_kw: 226.0, battery_soc_after: 77.8, reason: "Solar irradiance peak (122kW); zero-diesel baseline fully sustained" },
  { hour: 3, diesel_kw: 0.0, solar_kw: 128.0, wind_kw: 98.0, battery_kw: 0.0, demand_kw: 222.0, battery_soc_after: 80.5, reason: "High solar yield; station life-support and laboratories on 100% clean power" },
  { hour: 4, diesel_kw: 0.0, solar_kw: 116.0, wind_kw: 102.0, battery_kw: 0.0, demand_kw: 218.0, battery_soc_after: 82.0, reason: "Solar and wind generation balancing HVAC and deep-ice scientific sensor arrays" },
  { hour: 5, diesel_kw: 0.0, solar_kw: 96.0, wind_kw: 121.0, battery_kw: 0.0, demand_kw: 217.0, battery_soc_after: 82.5, reason: "Katabatic wind pickup offsetting solar elevation decline; BESS saturated" },
  { hour: 6, diesel_kw: 0.0, solar_kw: 68.0, wind_kw: 132.0, battery_kw: 22.0, demand_kw: 222.0, battery_soc_after: 80.0, reason: "BESS micro-discharge (22kW) smoothing dusk transition" },
  { hour: 7, diesel_kw: 0.0, solar_kw: 38.0, wind_kw: 145.0, battery_kw: 38.0, demand_kw: 221.0, battery_soc_after: 76.5, reason: "Battery buffer and wind balancing low-horizon solar angle" },
  { hour: 8, diesel_kw: 0.0, solar_kw: 12.0, wind_kw: 158.0, battery_kw: 55.0, demand_kw: 225.0, battery_soc_after: 71.0, reason: "Wind turbine generation maintaining primary grid bus frequency (50.02 Hz)" },
  { hour: 9, diesel_kw: 15.0, solar_kw: 0.0, wind_kw: 146.0, battery_kw: 62.0, demand_kw: 223.0, battery_soc_after: 66.0, reason: "Diesel generator standby warm-up (15kW); minimal dispatch for voltage support" },
  { hour: 10, diesel_kw: 22.0, solar_kw: 0.0, wind_kw: 138.0, battery_kw: 58.0, demand_kw: 218.0, battery_soc_after: 61.5, reason: "Night cycle power balance maintained within optimal diesel efficiency envelope" },
  { hour: 11, diesel_kw: 10.0, solar_kw: 24.0, wind_kw: 142.0, battery_kw: 45.0, demand_kw: 221.0, battery_soc_after: 58.0, reason: "Dawn solar emergence; diesel throttle back sequence initiated" },
];

export const mockBlizzardStatus: StatusResponse = {
  severity: "emergency",
  battery: {
    capacity_kwh: 540.0,
    usable_kwh: 432.0,
    current_kwh: 240.0,
    discharge_kw: 65.0,
  },
  diesel_health: 64,
  restock_days_remaining: 2,
};

// Blizzard consumption: 330 ± rand(0-10) kW (range 320 - 340 kW)
export const mockBlizzardSchedule: ScheduleResponse = [
  { hour: 0, diesel_kw: 220.0, solar_kw: 0.0, wind_kw: 48.0, battery_kw: 62.0, demand_kw: 330.0, battery_soc_after: 44.4, reason: "Katabatic blizzard: 68kt winds, zero solar PV, diesel genset #1 primary (220kW)" },
  { hour: 1, diesel_kw: 235.0, solar_kw: 0.0, wind_kw: 35.0, battery_kw: 68.0, demand_kw: 338.0, battery_soc_after: 39.2, reason: "Diesel ramp-up to support station heating coils and life-support circuits" },
  { hour: 2, diesel_kw: 240.0, solar_kw: 0.0, wind_kw: 28.0, battery_kw: 66.0, demand_kw: 334.0, battery_soc_after: 34.1, reason: "Peak blizzard heating load; BESS buffer discharging within thermal limit" },
  { hour: 3, diesel_kw: 245.0, solar_kw: 0.0, wind_kw: 32.0, battery_kw: 52.0, demand_kw: 329.0, battery_soc_after: 30.2, reason: "Full diesel generation dispatch; BESS discharge modulated to preserve cell life" },
  { hour: 4, diesel_kw: 230.0, solar_kw: 0.0, wind_kw: 45.0, battery_kw: 50.0, demand_kw: 325.0, battery_soc_after: 26.5, reason: "Wind speed fluctuating between 55-75 kt; turbine pitch feathering active" },
  { hour: 5, diesel_kw: 225.0, solar_kw: 0.0, wind_kw: 58.0, battery_kw: 48.0, demand_kw: 331.0, battery_soc_after: 23.0, reason: "Turbine generator #2 re-engaged on microgrid bus" },
  { hour: 6, diesel_kw: 215.0, solar_kw: 0.0, wind_kw: 72.0, battery_kw: 40.0, demand_kw: 327.0, battery_soc_after: 20.2, reason: "Wind generation recovering; diesel throttling down to baseline" },
  { hour: 7, diesel_kw: 200.0, solar_kw: 0.0, wind_kw: 88.0, battery_kw: 34.0, demand_kw: 322.0, battery_soc_after: 19.5, reason: "Wind gust stability improving; BESS float discharge reduced" },
  { hour: 8, diesel_kw: 185.0, solar_kw: 0.0, wind_kw: 110.0, battery_kw: 32.0, demand_kw: 327.0, battery_soc_after: 21.0, reason: "Wind-diesel hybrid balancing active; emergency reserve preserved" },
  { hour: 9, diesel_kw: 165.0, solar_kw: 5.0, wind_kw: 132.0, battery_kw: 28.0, demand_kw: 330.0, battery_soc_after: 23.5, reason: "Renewable penetration increasing to 50% as blizzard eye passes" },
  { hour: 10, diesel_kw: 140.0, solar_kw: 12.0, wind_kw: 154.0, battery_kw: 26.0, demand_kw: 332.0, battery_soc_after: 27.0, reason: "Diesel gen transitioned to partial-load backup state" },
  { hour: 11, diesel_kw: 110.0, solar_kw: 22.0, wind_kw: 175.0, battery_kw: 20.0, demand_kw: 327.0, battery_soc_after: 31.0, reason: "Microgrid stabilized; blizzard emergency warning downgrade in progress" },
];

export const normalTelemetry: TelemetryMetrics = {
  ambientTemp: -38,
  windSpeed: 48,
  windDir: 'SSE',
  syncLatency: 42,
  busFrequency: 50.02,
  peakCapacity: 280.0,
  solarElevation: 12.4,
  katabaticWindProj: 50,
  internalCellTemp: 14.2,
  healthCycleIndex: 97.8,
  fuelReservePct: 52,
  fuelReserveLiters: 14200,
  runningHours: 4120.4,
  serviceRemainHours: 379.5,
  exhaustTemp: 342,
};

export const blizzardTelemetry: TelemetryMetrics = {
  ambientTemp: -47,
  windSpeed: 68,
  windDir: 'S',
  syncLatency: 88,
  busFrequency: 49.85,
  peakCapacity: 380.0,
  solarElevation: 0.0,
  katabaticWindProj: 75,
  internalCellTemp: 8.4,
  healthCycleIndex: 96.1,
  fuelReservePct: 41,
  fuelReserveLiters: 11200,
  runningHours: 4148.2,
  serviceRemainHours: 351.7,
  exhaustTemp: 418,
};

export interface HistoryPoint {
  time: string;
  offsetHours: number;
  wind: number;
  solar: number;
  bess: number;
  diesel: number;
  demand: number;
}

export const generate72HourHistory = (scenario: 'normal' | 'blizzard'): HistoryPoint[] => {
  const points: HistoryPoint[] = [];
  const hours = 72;
  for (let i = 0; i <= hours; i += 3) {
    const t = hours - i;
    const label = t === 0 ? 'CURRENT DISPATCH (T-0)' : `T -${t} HOURS`;
    
    // Normal: 220 ± rand(0-10) kW | Blizzard: 330 ± rand(0-10) kW
    if (scenario === 'blizzard') {
      const blizzardIntensity = Math.sin((i / 72) * Math.PI);
      const demandVal = parseFloat((330 + (Math.sin(i * 0.7) * 7) + (Math.random() * 6 - 3)).toFixed(1));
      const dieselVal = parseFloat((210 + blizzardIntensity * 35 + (Math.random() * 8 - 4)).toFixed(1));
      const windVal = parseFloat((55 + Math.random() * 15).toFixed(1));
      const bessVal = parseFloat((demandVal - dieselVal - windVal).toFixed(1));

      points.push({
        time: label,
        offsetHours: -t,
        wind: windVal,
        solar: 0.0,
        bess: Math.max(0, bessVal),
        diesel: dieselVal,
        demand: demandVal,
      });
    } else {
      const cycle = Math.sin((i % 24) / 24 * Math.PI * 2);
      const demandVal = parseFloat((220 + (Math.sin(i * 0.5) * 8) + (Math.random() * 4 - 2)).toFixed(1));
      const solarVal = parseFloat((Math.max(0, cycle * 115 + 10)).toFixed(1));
      const windVal = parseFloat((95 + Math.sin(i / 10) * 25 + Math.random() * 10).toFixed(1));
      const rem = demandVal - (solarVal + windVal);
      const bessVal = parseFloat((Math.max(0, Math.min(60, rem > 0 ? rem : 15))).toFixed(1));
      const dieselVal = parseFloat((Math.max(0, demandVal - (solarVal + windVal + bessVal))).toFixed(1));

      points.push({
        time: label,
        offsetHours: -t,
        wind: windVal,
        solar: solarVal,
        bess: bessVal,
        diesel: dieselVal,
        demand: demandVal,
      });
    }
  }
  return points;
};

export interface ForecastPoint {
  time: string;
  actual: number | null;
  predicted: number | null;
  upperConfidence: number | null;
  lowerConfidence: number | null;
  threshold: number;
}

// 24-Hour Forecast Curve centered at 220 kW (normal) or 330 kW (blizzard) with ±10kW random variation
export const generate24HourForecast = (scenario: 'normal' | 'blizzard'): ForecastPoint[] => {
  const points: ForecastPoint[] = [];
  const labels = ['-6H', '-5H', '-4H', '-3H', '-2H', '-1H', 'NOW (T-0)', '+2H', '+4H', '+6H [SUNRISE]', '+8H', '+10H', '+12H', '+14H', '+16H', '+18H', '+20H', '+22H', '+24H'];
  
  labels.forEach((label, idx) => {
    const isPastOrNow = idx <= 6;
    
    // Base load calculation: 220 kW ± 10 kW (normal) or 330 kW ± 10 kW (blizzard)
    const baseCenter = scenario === 'blizzard' ? 330 : 220;
    const baseVariation = Math.sin(idx * 0.45) * 6.5 + Math.cos(idx * 0.25) * 3.5;
    const loadVal = parseFloat((baseCenter + baseVariation).toFixed(1));

    const actual = isPastOrNow ? loadVal : null;
    const predicted = idx >= 6 ? parseFloat((loadVal + (idx === 6 ? 0 : Math.sin(idx * 0.6) * 3.5)).toFixed(1)) : null;
    const upperConfidence = predicted !== null ? parseFloat((predicted + 9.5).toFixed(1)) : null;
    const lowerConfidence = predicted !== null ? parseFloat((predicted - 9.5).toFixed(1)) : null;

    points.push({
      time: label,
      actual,
      predicted,
      upperConfidence,
      lowerConfidence,
      threshold: scenario === 'blizzard' ? 350 : 280,
    });
  });

  return points;
};
