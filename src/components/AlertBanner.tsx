import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { SeverityLevel } from '../types';

interface AlertBannerProps {
  severity: SeverityLevel;
  restockDaysRemaining: number;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  severity,
  restockDaysRemaining = 4,
}) => {
  return (
    <div className="hud-card p-3 sm:p-3.5 flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
            Priority Operational Alerts
          </h3>
        </div>

        <span className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider">
          EVENT JOURNAL
        </span>
      </div>

      {/* Compact Alert List */}
      <div className="flex flex-col gap-2 my-1 overflow-y-auto max-h-[135px] pr-1">
        {/* Emergency Alert (if blizzard/emergency) */}
        {severity === 'emergency' && (
          <div className="p-2 rounded-lg bg-red-950/50 backdrop-blur-md border-l-4 border-red-500 border-t border-r border-b border-red-500/30 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-red-400 font-bold tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                CRITICAL // KATABATIC STORM PROTOCOL
              </span>
              <span className="text-slate-300 font-telemetry font-semibold">T-02M</span>
            </div>
            <p className="text-[11px] text-red-200 mt-0.5 leading-snug font-sans">
              Wind shear exceeding 65 kt. Diesel Gen #1 forced dispatch to protect habitat life-support.
            </p>
          </div>
        )}

        {/* Amber Alert / Logistics */}
        <div className="p-2 rounded-lg bg-amber-950/30 backdrop-blur-md border-l-4 border-amber-500 border-t border-r border-b border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-amber-400 font-bold tracking-wider">
              AMBER ALERT // LOGISTICS
            </span>
            <span className="text-slate-400 font-telemetry">T-10M</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug font-sans">
            Diesel restock weather window closing in <strong className="text-amber-300 font-mono">{restockDaysRemaining} days</strong> due to approaching Katabatic polar low.
          </p>
        </div>

        {/* Advisory / Automation */}
        <div className="p-2 rounded-lg bg-sky-950/30 backdrop-blur-md border-l-4 border-sky-500 border-t border-r border-b border-sky-500/20 shadow-[0_0_8px_rgba(2,132,199,0.1)]">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-sky-400 font-bold tracking-wider">
              ADVISORY // AUTOMATION
            </span>
            <span className="text-slate-400 font-telemetry">T-1H 12M</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug font-sans">
            Solar PV Array #3 angle tilt auto-optimized +6.5° for low-horizon polar azimuth.
          </p>
        </div>

        {/* Resolved / Harmonics */}
        <div className="p-2 rounded-lg bg-emerald-950/30 backdrop-blur-md border-l-4 border-emerald-500 border-t border-r border-b border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-emerald-400 font-bold tracking-wider">
              RESOLVED // GRID HARMONICS
            </span>
            <span className="text-slate-400 font-telemetry">T-3H 45M</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug font-sans">
            Inverter #2 harmonic sync stabilized. Total THD damped to 1.12% nominal baseline.
          </p>
        </div>
      </div>
    </div>
  );
};

