import { StatusResponse, ScheduleResponse, DataSourceMode, TelemetryMetrics } from '../types';
import {
  mockNormalStatus,
  mockNormalSchedule,
  mockBlizzardStatus,
  mockBlizzardSchedule,
  normalTelemetry,
  blizzardTelemetry,
} from '../mock/mockData';
import {
  fetchMaitriLiveWeather,
  buildLiveWeatherStatus,
  buildLiveWeatherSchedule,
  buildLiveWeatherTelemetry,
  LiveWeatherData,
} from './weatherService';

// Configurable API base URL from env var or default localhost:8000
export const API_BASE_URL = 'https://dypole.onrender.com';

// Configurable polling interval (30 seconds as specified in requirements)
export const POLL_INTERVAL_MS = 30000;

export interface FetchResult<T> {
  data: T;
  isMock: boolean;
  error?: string;
  weatherMetadata?: LiveWeatherData;
}

// Cached weather instance for synchronized 30s cycle
let cachedWeather: LiveWeatherData | null = null;
let lastWeatherFetch = 0;

async function getOrFetchWeather(): Promise<LiveWeatherData> {
  const now = Date.now();
  if (!cachedWeather || now - lastWeatherFetch > 25000) {
    cachedWeather = await fetchMaitriLiveWeather();
    lastWeatherFetch = now;
  }
  return cachedWeather;
}

export const fetchStatus = async (
  mode: DataSourceMode = 'live-weather'
): Promise<FetchResult<StatusResponse>> => {
  if (mode === 'mock-normal') {
    return { data: mockNormalStatus, isMock: true };
  }
  if (mode === 'mock-blizzard') {
    return { data: mockBlizzardStatus, isMock: true };
  }
  if (mode === 'live-weather') {
    const weather = await getOrFetchWeather();
    const statusData = buildLiveWeatherStatus(weather);
    return {
      data: statusData,
      isMock: false,
      weatherMetadata: weather,
    };
  }

  // Live Backend API Mode
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_BASE_URL}/status`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data: StatusResponse = await res.json();
    return { data, isMock: false };
  } catch (err: any) {
    console.warn(`[API] Could not reach backend at ${API_BASE_URL}/status (${err.message}). Falling back to live weather meteorological detection.`);
    const weather = await getOrFetchWeather();
    return {
      data: buildLiveWeatherStatus(weather),
      isMock: true,
      error: err.message,
      weatherMetadata: weather,
    };
  }
};

export const fetchSchedule = async (
  mode: DataSourceMode = 'live-weather'
): Promise<FetchResult<ScheduleResponse>> => {
  if (mode === 'mock-normal') {
    return { data: mockNormalSchedule, isMock: true };
  }
  if (mode === 'mock-blizzard') {
    return { data: mockBlizzardSchedule, isMock: true };
  }
  if (mode === 'live-weather') {
    const weather = await getOrFetchWeather();
    const scheduleData = buildLiveWeatherSchedule(weather);
    return {
      data: scheduleData,
      isMock: false,
      weatherMetadata: weather,
    };
  }

  // Live Backend API Mode
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_BASE_URL}/schedule`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data: ScheduleResponse = await res.json();
    return { data, isMock: false };
  } catch (err: any) {
    console.warn(`[API] Could not reach backend at ${API_BASE_URL}/schedule (${err.message}). Falling back to live weather schedule.`);
    const weather = await getOrFetchWeather();
    return {
      data: buildLiveWeatherSchedule(weather),
      isMock: true,
      error: err.message,
      weatherMetadata: weather,
    };
  }
};

export const getTelemetryForMode = (
  mode: DataSourceMode,
  severity: string,
  weatherMetadata?: LiveWeatherData
): TelemetryMetrics => {
  if (mode === 'live-weather' || weatherMetadata) {
    if (weatherMetadata) {
      return buildLiveWeatherTelemetry(weatherMetadata);
    }
    if (cachedWeather) {
      return buildLiveWeatherTelemetry(cachedWeather);
    }
  }

  if (mode === 'mock-blizzard' || severity === 'emergency') {
    return blizzardTelemetry;
  }
  return normalTelemetry;
};
