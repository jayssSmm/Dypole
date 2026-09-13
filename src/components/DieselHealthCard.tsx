import React from 'react';
import { Fuel } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TelemetryMetrics } from '../types';

interface DieselHealthCardProps {
  dieselHealth?: number;
  restockDaysRemaining?: number;
  telemetry: TelemetryMetrics;
}

export const DieselHealthCard: React.FC<DieselHealthCardProps> = ({
  dieselHealth = 78,
  restockDaysRemaining = 4,
  telemetry,
}) => {
  // Sparkline trend data
  const sparklineData = [
    { day: 'T-30', score: Math.min(100, dieselHealth + 12) },
    { day: 'T-24', score: Math.min(100, dieselHealth + 10) },
    { day: 'T-18', score: Math.min(100, dieselHealth + 8) },
    { day: 'T-12', score: Math.min(100, dieselHealth + 5) },
    { day: 'T-6', score: Math.min(100, dieselHealth + 2) },
    { day: 'Today', score: dieselHealth },
  ];

  const fuelPct = restockDaysRemaining <= 2 ? 41 : 52;
  const fuelLiters = restockDaysRemaining <= 2 ? 11200 : 14200;

  return (
    <div className="hud-card p-3 sm:p-3.5 flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Fuel className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
            Diesel Gen
          </h3>
        </div>

        <div className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border bg-amber-950/60 border-amber-500/80 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
          STANDBY / 8% LOAD
        </div>
      </div>

      {/* Engine Health Score & Sparkline */}
      <div className="my-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
            ENGINE HEALTH SCORE
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-telemetry glow-amber-text leading-none">
              {dieselHealth}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
          </div>
        </div>

        {/* Sparkline Graph */}
        <div className="h-6 w-full my-0.5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2.5, fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sparkline Labels */}
        <div className="flex items-center justify-between text-[8px] text-slate-400 font-medium">
          <span>T-30D ({Math.min(100, dieselHealth + 12)})</span>
          <span className="text-slate-500">EROSION: -0.2%/WK</span>
          <span className="text-amber-300 font-semibold">NOW ({dieselHealth})</span>
        </div>
      </div>

      {/* 2x2 Compact Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            FUEL RESERVE
          </div>
          <div className="text-xs sm:text-sm font-bold text-amber-400 font-telemetry mt-0.5">
            {fuelPct}% ({fuelLiters.toLocaleString()} L)
          </div>
        </div>

        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            RUNNING HOURS
          </div>
          <div className="text-xs sm:text-sm font-bold text-white font-telemetry mt-0.5">
            {telemetry.runningHours.toFixed(1)} HRS
          </div>
        </div>

        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            NEXT SERVICE
          </div>
          <div className="text-xs sm:text-sm font-bold text-cyan-300 font-telemetry mt-0.5">
            {telemetry.serviceRemainHours.toFixed(1)}H REMAIN
          </div>
        </div>

        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            EXHAUST TEMP
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-200 font-telemetry mt-0.5">
            {telemetry.exhaustTemp}°C (NOMINAL)
          </div>
        </div>
      </div>
    </div>
  );
};

