import React from 'react';
import { LayoutDashboard, TrendingUp, FileText, Sliders } from 'lucide-react';
import { TelemetryMetrics } from '../types';

interface StationSubheaderProps {
  currentView: string;
  onSelectView: (view: string) => void;
  telemetry: TelemetryMetrics;
  onOpenAppearanceModal?: () => void;
}

export const StationSubheader: React.FC<StationSubheaderProps> = ({
  currentView,
  onSelectView,
  telemetry,
  onOpenAppearanceModal,
}) => {
  return (
    <div className="hud-glass-header border-b border-white/[0.08] px-4 py-2 flex flex-wrap items-center justify-between gap-y-2 text-xs font-mono select-none">
      {/* View Switchers */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => onSelectView('overview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider transition-colors ${
            currentView === 'overview'
              ? 'bg-white/[0.08] text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>OVERVIEW (ACTIVE)</span>
        </button>

        <button
          onClick={() => onSelectView('forecast')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider transition-colors ${
            currentView === 'forecast'
              ? 'bg-white/[0.08] text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>FORECAST DETAIL</span>
        </button>

        <button
          onClick={() => onSelectView('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider transition-colors ${
            currentView === 'history'
              ? 'bg-white/[0.08] text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>ALLOCATION HISTORY</span>
        </button>

        <button
          onClick={() => {
            onSelectView('config');
            if (onOpenAppearanceModal) onOpenAppearanceModal();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider transition-colors ${
            currentView === 'config'
              ? 'bg-white/[0.08] text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>STATION CONFIG &amp; THEME</span>
        </button>
      </div>

      {/* Badges and Station Ops Phase */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-slate-500">POLAR OPS PHASE:</span>
          <span className="text-slate-200 font-semibold">WINTER-OVER CYCLE [DAY 114]</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-slate-400">
          <span className="text-slate-500">BUS FREQUENCY:</span>
          <span className="text-cyan-300 font-semibold font-telemetry">{telemetry.busFrequency.toFixed(2)} Hz ±0.03</span>
        </div>

        <div className="px-3 py-1 rounded-md border border-cyan-400/40 bg-cyan-950/40 text-cyan-300 font-bold tracking-wider text-[10px] shadow-[0_0_8px_rgba(0,240,255,0.15)]">
          PRIMARY GOAL: <span className="text-white">ZERO-DIESEL BASELINE PRESERVATION</span>
        </div>
      </div>
    </div>
  );
};

