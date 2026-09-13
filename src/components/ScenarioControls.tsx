import React from 'react';
import { DataSourceMode } from '../types';
import { API_BASE_URL, POLL_INTERVAL_MS } from '../services/api';
import { Server, AlertTriangle, CheckCircle, Clock, CloudSnow, Globe } from 'lucide-react';
import { LiveWeatherData } from '../services/weatherService';

interface ScenarioControlsProps {
  dataSourceMode: DataSourceMode;
  onSelectMode: (mode: DataSourceMode) => void;
  isMockFallback: boolean;
  lastFetchTime: Date | null;
  secondsUntilNextPoll: number;
  weatherMetadata?: LiveWeatherData;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  dataSourceMode,
  onSelectMode,
  isMockFallback,
  lastFetchTime,
  secondsUntilNextPoll,
  weatherMetadata,
}) => {
  return (
    <div className="bg-[#1e1e1e]/60 backdrop-blur-md border-b border-white/[0.08] px-4 py-2.5 flex flex-wrap items-center justify-between gap-y-2 text-xs font-mono">
      {/* Scenario & Mode Switcher */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-slate-300 text-[11px] font-medium flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span>DATA SOURCE:</span>
        </span>

        <div className="inline-flex flex-wrap rounded-lg bg-black/30 p-1 border border-white/10 backdrop-blur-md gap-1">
          {/* 1. Live Weather Search Engine Mode */}
          <button
            onClick={() => onSelectMode('live-weather')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all ${
              dataSourceMode === 'live-weather'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>LIVE WEATHER (MAITRI -70.76°S)</span>
          </button>

          {/* 2. Mock Normal Mode */}
          <button
            onClick={() => onSelectMode('mock-normal')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all ${
              dataSourceMode === 'mock-normal'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MOCK NORMAL (220kW)
          </button>

          {/* 3. Mock Blizzard Mode */}
          <button
            onClick={() => onSelectMode('mock-blizzard')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all ${
              dataSourceMode === 'mock-blizzard'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MOCK BLIZZARD (330kW)
          </button>

          {/* 4. Live API Mode */}
          <button
            onClick={() => onSelectMode('live-api')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all ${
              dataSourceMode === 'live-api'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            LIVE API
          </button>
        </div>

        {/* Live Weather Status Indicator Badge */}
        {dataSourceMode === 'live-weather' && weatherMetadata && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border ${
            weatherMetadata.isBlizzard
              ? 'bg-red-950/60 border-red-500/50 text-red-300 animate-pulse'
              : 'bg-cyan-950/60 border-cyan-400/50 text-cyan-300'
          }`}>
            <CloudSnow className="w-3.5 h-3.5" />
            <span>
              MAITRI: {weatherMetadata.temperature}°C, {weatherMetadata.windSpeedKnots}kt {weatherMetadata.windDirectionCompass} — {weatherMetadata.isBlizzard ? '🚨 BLIZZARD DETECTED (330kW LOAD)' : 'NORMAL PROFILE (220kW LOAD)'}
            </span>
          </span>
        )}

        {/* Live API Status Badge */}
        {dataSourceMode === 'live-api' && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium ${
            isMockFallback 
              ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300' 
              : 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
          }`}>
            {isMockFallback ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Backend offline (Auto Fallback)</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected to {API_BASE_URL}</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Polling Heartbeat / Countdown */}
      <div className="flex items-center gap-3 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sync interval: <strong className="text-white">{POLL_INTERVAL_MS / 1000}s</strong></span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-[10px] text-cyan-300 font-telemetry">Next poll in {secondsUntilNextPoll}s</span>
        </div>

        {lastFetchTime && (
          <span className="hidden sm:inline text-[10px] text-slate-400">
            Last sync: {lastFetchTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};
