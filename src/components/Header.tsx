import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  History, 
  Wifi,
  RefreshCw,
  Palette
} from 'lucide-react';
import { TelemetryMetrics, SeverityLevel } from '../types';
import { AppearanceSettings } from '../hooks/useAppearance';

interface HeaderProps {
  telemetry: TelemetryMetrics;
  severity: SeverityLevel;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onEmergencyOverride: () => void;
  appearance: AppearanceSettings;
  onOpenAppearanceModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  severity,
  activeTab,
  onSelectTab,
  onRefresh,
  isRefreshing,
  onEmergencyOverride,
  appearance,
  onOpenAppearanceModal,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="hud-glass-header border-b border-white/10 text-xs font-mono select-none px-4 py-2.5 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        {/* Left Section: Branding & Polar Coordinates */}
        <div className="flex items-center gap-3">
          <div 
            onClick={onOpenAppearanceModal}
            className="flex items-center gap-2 cursor-pointer group"
            title="Click to customize station logo & branding"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-950/70 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.45)] overflow-hidden group-hover:border-cyan-300 group-hover:scale-105 transition-all">
              {appearance.customLogo ? (
                <img
                  src={appearance.customLogo}
                  alt="Station Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-extrabold text-sm tracking-wider group-hover:text-cyan-200 transition-colors">
                {appearance.stationName || 'DyPole'}
              </span>
              <span className="text-cyan-400 font-semibold text-xs tracking-widest">
                {appearance.stationSubtitle || 'POWER CONTROL'}
              </span>
            </div>
          </div>

          <div className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[10px] text-slate-300 tracking-wider">
            <span>ANTARCTICA 70°46&apos;S 11°44&apos;E</span>
          </div>
        </div>

        {/* Center Section: Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-3">
          <button
            onClick={() => onSelectTab('telemetry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium tracking-wider ${
              activeTab === 'telemetry'
                ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>GRID TELEMETRY</span>
          </button>

          <button
            onClick={() => onSelectTab('diagnostics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium tracking-wider ${
              activeTab === 'diagnostics'
                ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>HEALTH &amp; DIAGNOSTICS</span>
          </button>

          <button
            onClick={() => onSelectTab('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium tracking-wider ${
              activeTab === 'alerts'
                ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>ALERTS LOG (72H)</span>
          </button>
        </nav>

        {/* Right Section: Live Telemetry, UTC Clock, Customization & Emergency Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Amb Temp */}
          <div className="hidden md:flex flex-col text-right leading-tight">
            <span className="text-[9px] text-slate-400 font-semibold">AMB:</span>
            <span className="text-slate-200 font-bold">{telemetry.ambientTemp}°C</span>
          </div>

          {/* Wind */}
          <div className="hidden md:flex flex-col text-right leading-tight">
            <span className="text-[9px] text-slate-400 font-semibold">WIND:</span>
            <span className={`font-bold ${telemetry.windSpeed > 50 ? 'text-amber-400' : 'text-slate-200'}`}>
              {telemetry.windSpeed} kt {telemetry.windDir}
            </span>
          </div>

          {/* Sync */}
          <div className="hidden lg:flex flex-col text-right leading-tight">
            <span className="text-[9px] text-slate-400 font-semibold">SYNC:</span>
            <span className="text-cyan-400 font-bold">{telemetry.syncLatency}MS</span>
          </div>

          {/* Armed Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/50 border border-emerald-500/50 text-[10px] text-emerald-400 font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM ARMED</span>
          </div>

          {/* UTC Clock */}
          <div className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-slate-200 text-[11px] font-bold tracking-wider">
            {utcTime || '18:09:41 UTC'}
          </div>

          {/* Gateway Status */}
          <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-slate-400">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>SAT-LINK 03 (DIRECT)</span>
          </div>

          {/* Theme & Background Customization Button */}
          <button
            onClick={onOpenAppearanceModal}
            title="Customize Background & Logo (Upload custom JPG/JPEG)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-400/50 text-cyan-300 hover:text-cyan-100 transition-all shadow-[0_0_8px_rgba(0,240,255,0.2)] text-[10px] font-bold"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CUSTOMIZE</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Force refresh telemetry"
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Emergency Override Button */}
          <button
            onClick={onEmergencyOverride}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider border transition-all ${
              severity === 'emergency'
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-white/[0.04] border-white/15 text-slate-300 hover:border-red-500 hover:text-red-400 hover:bg-red-950/30'
            }`}
          >
            EMERGENCY OVERRIDE
          </button>
        </div>
      </div>
    </header>
  );
};

