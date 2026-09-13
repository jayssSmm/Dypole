export type SeverityLevel = 'normal' | 'warning' | 'emergency';

export interface BatteryStatus {
  capacity_kwh: number;
  usable_kwh: number;
  current_kwh: number;
  discharge_kw: number;
}

export interface StatusResponse {
  severity: SeverityLevel;
  battery: BatteryStatus;
  diesel_health: number;
  restock_days_remaining: number;
}

export interface ScheduleHour {
  hour: number;
  diesel_kw: number;
  solar_kw: number;
  wind_kw: number;
  battery_kw: number;
  demand_kw: number;
  battery_soc_after: number;
  reason: string;
}

export type ScheduleResponse = ScheduleHour[];

export type DataSourceMode = 'live-weather' | 'mock-normal' | 'mock-blizzard' | 'live-api';

export interface TelemetryMetrics {
  ambientTemp: number; // e.g., -38
  windSpeed: number; // e.g., 48
  windDir: string; // e.g., 'SSE'
  syncLatency: number; // e.g., 42
  busFrequency: number; // e.g., 50.02
  peakCapacity: number; // e.g., 280.0
  solarElevation: number; // e.g., 12.4
  katabaticWindProj: number; // e.g., 50
  internalCellTemp: number; // e.g., 14.2
  healthCycleIndex: number; // e.g., 97.8
  fuelReservePct: number; // e.g., 52
  fuelReserveLiters: number; // e.g., 14200
  runningHours: number; // e.g., 4120.4
  serviceRemainHours: number; // e.g., 379.5
  exhaustTemp: number; // e.g., 342
}
