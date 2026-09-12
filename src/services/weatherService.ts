import { StatusResponse, ScheduleResponse, TelemetryMetrics, SeverityLevel } from '../types';

export interface LiveWeatherData {
  temperature: number; // °C
  windSpeedKmh: number; // km/h
  windSpeedKnots: number; // kt
  windDirectionDeg: number; // °
  windDirectionCompass: string; // e.g., 'SSE'
  weatherCode: number; // WMO code
  weatherDescription: string;
  surfacePressure: number; // hPa
  cloudCover: number; // %
  isDay: boolean;
  hourlyIrradiance: number[];
  hourlyWindKmh: number[];
  hourlyTemp: number[];
  isBlizzard: boolean;
  blizzardConfidence: number; // %
}

// Convert wind direction degrees to 16-point compass
export function degToCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// Translate WMO Weather Code to human-readable description
export function getWMODescription(code: number): string {
  switch (code) {
    case 0: return 'Clear Sky / Antarctic High';
    case 1: return 'Mainly Clear';
    case 2: return 'Partly Cloudy';
    case 3: return 'Overcast Polar Stratus';
    case 45: case 48: return 'Freezing Fog / Ice Haze';
    case 51: case 53: case 55: return 'Freezing Drizzle';
    case 71: case 73: case 75: return 'Snowfall / Ice Crystals';
    case 77: return 'Snow Grains / Sleet';
    case 85: case 86: return 'Severe Snow Squalls / Blizzard Winds';
    case 95: case 96: case 99: return 'Severe Katabatic Gale / Blizzard Warning';
    default: return 'Sub-Zero Polar Weather';
  }
}

/**
 * Fetch real-time weather data for Maitri Antarctic Station (-70.7667°S, 11.7333°E)
 * Uses open meteorological data endpoint.
 */
export async function fetchMaitriLiveWeather(): Promise<LiveWeatherData> {
  const lat = -70.7667;
  const lon = 11.7333;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure,cloud_cover,is_day&hourly=temperature_2m,wind_speed_10m,direct_normal_irradiance&forecast_days=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Weather API error HTTP ${res.status}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const temp = current.temperature_2m ?? -24.0;
    const windKmh = current.wind_speed_10m ?? 25.0;
    const windKnots = Math.round(windKmh * 0.539957);
    const windDir = current.wind_direction_10m ?? 210;
    const weatherCode = current.weather_code ?? 1;
    const pressure = current.surface_pressure ?? 972.0;
    const cloudCover = current.cloud_cover ?? 30;
    const isDay = Boolean(current.is_day);

    // Blizzard Detection Rules:
    // 1. Extreme wind >= 35 kt (65 km/h)
    // 2. Severe snow / blizzard WMO codes (71, 73, 75, 77, 85, 86, 95, 96, 99)
    // 3. Katabatic storm with wind >= 28 kt and temp <= -30°C
    // 4. Extreme pressure drop (< 960 hPa)
    const isSevereSnow = [71, 73, 75, 77, 85, 86, 95, 96, 99].includes(weatherCode);
    const isHighWind = windKnots >= 35;
    const isFreezingGale = windKnots >= 28 && temp <= -30;
    const isPressureDrop = pressure < 960.0;

    const isBlizzard = isHighWind || isSevereSnow || isFreezingGale || isPressureDrop;
    const blizzardConfidence = isBlizzard
      ? Math.min(99, Math.round(50 + (windKnots * 0.6) + (isSevereSnow ? 25 : 0)))
      : Math.max(5, Math.round((windKnots / 35) * 40));

    return {
      temperature: temp,
      windSpeedKmh: windKmh,
      windSpeedKnots: windKnots,
      windDirectionDeg: windDir,
      windDirectionCompass: degToCompass(windDir),
      weatherCode,
      weatherDescription: getWMODescription(weatherCode),
      surfacePressure: pressure,
      cloudCover,
      isDay,
      hourlyIrradiance: data.hourly?.direct_normal_irradiance || [],
      hourlyWindKmh: data.hourly?.wind_speed_10m || [],
      hourlyTemp: data.hourly?.temperature_2m || [],
      isBlizzard,
      blizzardConfidence,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Weather] Using fallback Maitri meteorological profile:', err);

    // Realistic fallback profile for Maitri Station
    return {
      temperature: -24.0,
      windSpeedKmh: 42.0,
      windSpeedKnots: 23,
      windDirectionDeg: 214,
      windDirectionCompass: 'SSW',
      weatherCode: 1,
      weatherDescription: 'Mainly Clear / Polar Antarctic Baseline',
      surfacePressure: 971.8,
      cloudCover: 35,
      isDay: false,
      hourlyIrradiance: [0, 0, 0, 0, 0, 0, 100, 350, 600, 750, 800, 750],
      hourlyWindKmh: [25, 28, 30, 26, 24, 28, 32, 35, 40, 38, 36, 34],
      hourlyTemp: [-22, -23, -24, -24, -25, -24, -23, -22, -21, -22, -23, -24],
      isBlizzard: false,
      blizzardConfidence: 18,
    };
  }
}

/**
 * Build dynamic StatusResponse based on live weather condition
 */
export function buildLiveWeatherStatus(weather: LiveWeatherData): StatusResponse {
  const severity: SeverityLevel = weather.isBlizzard ? 'emergency' : (weather.windSpeedKnots > 28 ? 'warning' : 'normal');

  return {
    severity,
    battery: {
      capacity_kwh: 540.0,
      usable_kwh: 432.0,
      current_kwh: weather.isBlizzard ? 240.0 : 388.0,
      discharge_kw: weather.isBlizzard ? 65.0 : 32.0,
    },
    diesel_health: weather.isBlizzard ? 64 : 78,
    restock_days_remaining: weather.isBlizzard ? 2 : 4,
  };
}

/**
 * Build dynamic 12-Hour Schedule based on live weather data:
 * - Normal: 220 ± rand(0-10) kW (range 210 - 230 kW)
 * - Blizzard: 330 ± rand(0-10) kW (range 320 - 340 kW)
 */
export function buildLiveWeatherSchedule(weather: LiveWeatherData): ScheduleResponse {
  const isBlizzard = weather.isBlizzard;
  const schedule: ScheduleResponse = [];

  for (let hour = 0; hour < 12; hour++) {
    // 220 ± rand(0-10) kW or 330 ± rand(0-10) kW
    const baseDemand = isBlizzard ? 330 : 220;
    const randomOffset = (Math.sin(hour * 0.75 + (weather.windSpeedKnots % 5)) * 6.5) + (Math.cos(hour * 0.4) * 3.0);
    const demandKw = parseFloat((baseDemand + randomOffset).toFixed(1));

    if (isBlizzard) {
      // Blizzard Mode: 330 ± 10 kW
      const dieselKw = parseFloat((Math.min(260, Math.max(200, 220 + hour * 2.5))).toFixed(1));
      const windKw = parseFloat((Math.max(25, Math.min(80, weather.windSpeedKnots * 1.2 + Math.sin(hour) * 15))).toFixed(1));
      const bessKw = parseFloat((Math.max(0, demandKw - dieselKw - windKw)).toFixed(1));

      schedule.push({
        hour,
        diesel_kw: dieselKw,
        solar_kw: 0.0,
        wind_kw: windKw,
        battery_kw: bessKw,
        demand_kw: demandKw,
        battery_soc_after: parseFloat((44.4 - hour * 1.4).toFixed(1)),
        reason: `Live Weather Blizzard Alert: Wind ${weather.windSpeedKnots}kt ${weather.windDirectionCompass}, Temp ${weather.temperature}°C. Diesel Gen #1 primary (${dieselKw}kW) to meet ${demandKw}kW heating load.`,
      });
    } else {
      // Normal Mode: 220 ± 10 kW
      const solarPotential = hour >= 2 && hour <= 8 ? (Math.sin(((hour - 2) / 6) * Math.PI) * 125) : 0;
      const solarKw = parseFloat((Math.max(0, solarPotential * (1 - (weather.cloudCover / 150)))).toFixed(1));
      const windKw = parseFloat((Math.max(40, Math.min(160, 95 + (weather.windSpeedKnots * 1.5) + Math.sin(hour * 0.8) * 20))).toFixed(1));
      const rem = demandKw - (solarKw + windKw);
      const bessKw = parseFloat((Math.max(0, Math.min(65, rem > 0 ? rem : 15))).toFixed(1));
      const dieselKw = parseFloat((Math.max(0, demandKw - (solarKw + windKw + bessKw))).toFixed(1));

      schedule.push({
        hour,
        diesel_kw: dieselKw,
        solar_kw: solarKw,
        wind_kw: windKw,
        battery_kw: bessKw,
        demand_kw: demandKw,
        battery_soc_after: parseFloat((72.5 + (solarKw > 60 ? hour * 1.2 : -hour * 0.8)).toFixed(1)),
        reason: `Live Weather [${weather.weatherDescription}]: Wind ${weather.windSpeedKnots}kt ${weather.windDirectionCompass}, Temp ${weather.temperature}°C. Renewables cover ${Math.round(((solarKw + windKw + bessKw) / demandKw) * 100)}% of ${demandKw}kW demand.`,
      });
    }
  }

  return schedule;
}

/**
 * Build dynamic real-time telemetry metrics using live weather
 */
export function buildLiveWeatherTelemetry(weather: LiveWeatherData): TelemetryMetrics {
  return {
    ambientTemp: weather.temperature,
    windSpeed: weather.windSpeedKnots,
    windDir: weather.windDirectionCompass,
    syncLatency: Math.round(35 + Math.random() * 15),
    busFrequency: weather.isBlizzard ? 49.88 : 50.02,
    peakCapacity: weather.isBlizzard ? 380.0 : 280.0,
    solarElevation: weather.isDay ? 14.2 : 0.0,
    katabaticWindProj: Math.round(weather.windSpeedKnots * 1.25),
    internalCellTemp: weather.isBlizzard ? 8.6 : 14.2,
    healthCycleIndex: weather.isBlizzard ? 96.1 : 97.8,
    fuelReservePct: weather.isBlizzard ? 41 : 52,
    fuelReserveLiters: weather.isBlizzard ? 11200 : 14200,
    runningHours: 4120.4,
    serviceRemainHours: 379.5,
    exhaustTemp: weather.isBlizzard ? 418 : 342,
  };
}
