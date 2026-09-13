import React, { useState, useMemo } from 'react';
import {
  BatteryCharging,
  TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { TelemetryMetrics, BatteryStatus } from '../types';

interface BESSCellDegradationCardProps {
  battery?: BatteryStatus;
  telemetry: TelemetryMetrics;
}

type TimeframeOption = '1y' | '3y' | '7y' | 'lifetime';

export const BESSCellDegradationCard: React.FC<BESSCellDegradationCardProps> = ({
  battery,
  telemetry,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('3y');

  // Baseline capacity
  const initialCapacity = battery?.capacity_kwh ?? 5.4;
  const currentSOH = telemetry.healthCycleIndex ?? 96.4; // % SOH

  // Generate historical & predictive degradation dataset based on selected timeframe
  const chartData = useMemo(() => {
    if (timeframe === '1y') {
      return [
        { period: 'Q1 M1', soh: 99.4, capacity: +(initialCapacity * 0.994).toFixed(2), cycles: 120, baseline: 100 },
        { period: 'Q1 M3', soh: 98.7, capacity: +(initialCapacity * 0.987).toFixed(2), cycles: 340, baseline: 99.2 },
        { period: 'Q2 M6', soh: 97.9, capacity: +(initialCapacity * 0.979).toFixed(2), cycles: 690, baseline: 98.5 },
        { period: 'Q3 M9', soh: 97.1, capacity: +(initialCapacity * 0.971).toFixed(2), cycles: 1050, baseline: 97.8 },
        { period: 'Q4 M12', soh: currentSOH, capacity: +(initialCapacity * (currentSOH / 100)).toFixed(2), cycles: 1420, baseline: 97.0 },
      ];
    } else if (timeframe === '3y') {
      return [
        { period: 'Y0 (Start)', soh: 100.0, capacity: +initialCapacity.toFixed(2), cycles: 0, baseline: 100 },
        { period: 'Y0.5', soh: 98.6, capacity: +(initialCapacity * 0.986).toFixed(2), cycles: 710, baseline: 98.8 },
        { period: 'Y1.0', soh: 97.2, capacity: +(initialCapacity * 0.972).toFixed(2), cycles: 1420, baseline: 97.5 },
        { period: 'Y1.5 (Now)', soh: currentSOH, capacity: +(initialCapacity * (currentSOH / 100)).toFixed(2), cycles: 2130, baseline: 96.2 },
        { period: 'Y2.0 (Proj)', soh: 94.8, capacity: +(initialCapacity * 0.948).toFixed(2), cycles: 2840, baseline: 95.0 },
        { period: 'Y2.5 (Proj)', soh: 93.3, capacity: +(initialCapacity * 0.933).toFixed(2), cycles: 3550, baseline: 93.8 },
        { period: 'Y3.0 (Proj)', soh: 91.9, capacity: +(initialCapacity * 0.919).toFixed(2), cycles: 4260, baseline: 92.5 },
      ];
    } else if (timeframe === '7y') {
      return [
        { period: 'Yr 1', soh: 97.2, capacity: +(initialCapacity * 0.972).toFixed(2), cycles: 1420, baseline: 97.5 },
        { period: 'Yr 2', soh: 94.6, capacity: +(initialCapacity * 0.946).toFixed(2), cycles: 2840, baseline: 95.0 },
        { period: 'Yr 3', soh: 91.9, capacity: +(initialCapacity * 0.919).toFixed(2), cycles: 4260, baseline: 92.5 },
        { period: 'Yr 4', soh: 89.2, capacity: +(initialCapacity * 0.892).toFixed(2), cycles: 5680, baseline: 90.0 },
        { period: 'Yr 5', soh: 86.4, capacity: +(initialCapacity * 0.864).toFixed(2), cycles: 7100, baseline: 87.5 },
        { period: 'Yr 6', soh: 83.5, capacity: +(initialCapacity * 0.835).toFixed(2), cycles: 8520, baseline: 85.0 },
        { period: 'Yr 7 (EOL)', soh: 80.2, capacity: +(initialCapacity * 0.802).toFixed(2), cycles: 9940, baseline: 82.0 },
      ];
    } else {
      // Lifetime / 10y EOL
      return [
        { period: 'Yr 0', soh: 100.0, capacity: +initialCapacity.toFixed(2), cycles: 0, baseline: 100 },
        { period: 'Yr 2', soh: 94.8, capacity: +(initialCapacity * 0.948).toFixed(2), cycles: 2800, baseline: 95 },
        { period: 'Yr 4', soh: 89.4, capacity: +(initialCapacity * 0.894).toFixed(2), cycles: 5600, baseline: 90 },
        { period: 'Yr 6', soh: 83.8, capacity: +(initialCapacity * 0.838).toFixed(2), cycles: 8400, baseline: 85 },
        { period: 'Yr 8 (EOL Target)', soh: 78.2, capacity: +(initialCapacity * 0.782).toFixed(2), cycles: 11200, baseline: 80 },
        { period: 'Yr 10', soh: 72.0, capacity: +(initialCapacity * 0.720).toFixed(2), cycles: 14000, baseline: 74 },
      ];
    }
  }, [timeframe, initialCapacity, currentSOH]);

  const annualDegradationRate = 2.7; // % per year in Antarctic polar conditions
  const cycleCount = Math.round((100 - currentSOH) * 380);
  const resistanceGrowth = +((100 - currentSOH) * 2.1).toFixed(1);

  return (
    <div className="hud-card p-4 sm:p-5 flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-cyan-950/70 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
            <BatteryCharging className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              BESS Cell Degradation vs Time
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-400/40">
                LFP MATRIX
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              State of Health (SOH) retention &amp; capacity fade under polar sub-zero cycling
            </p>
          </div>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-[10px]">
          {(['1y', '3y', '7y', 'lifetime'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded transition-all uppercase font-semibold ${
                timeframe === tf
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf === 'lifetime' ? 'LIFE' : tf}
            </button>
          ))}
        </div>
      </div>

      {/* Degradation Chart */}
      <div className="my-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-cyan-400" />
              SOH CAPACITY RETENTION CURVE
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 text-[10px]">
              CURRENT SOH:{' '}
              <strong className="text-cyan-300 font-telemetry text-sm">
                {currentSOH.toFixed(1)}%
              </strong>
            </span>
            <span className="text-slate-400 text-[10px]">
              CAPACITY:{' '}
              <strong className="text-white font-telemetry">
                {(initialCapacity * (currentSOH / 100)).toFixed(2)} kWh
              </strong>
            </span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-44 w-full bg-black/20 rounded-lg p-2 border border-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sohGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis
                domain={[70, 102]}
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#181818',
                  borderColor: 'rgba(0, 240, 255, 0.4)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}
                formatter={(value: any, name: string) => [
                  `${Number(value).toFixed(1)}%`,
                  name === 'soh' ? 'Retained SOH' : 'Standard Warranty Baseline',
                ]}
                labelFormatter={(label) => `Timeline: ${label}`}
              />
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '80% EOL THRESHOLD', fill: '#ef4444', fontSize: 8, position: 'insideBottomRight' }} />
              <Area
                type="monotone"
                dataKey="baseline"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#baselineGradient)"
                name="baseline"
              />
              <Area
                type="monotone"
                dataKey="soh"
                stroke="#00f0ff"
                strokeWidth={2.5}
                fill="url(#sohGradient)"
                name="soh"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Degradation Diagnostics Subpanels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-white/10 pt-3">
        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            DEGRADATION RATE
          </div>
          <div className="text-xs sm:text-sm font-bold text-cyan-300 font-telemetry mt-0.5">
            -{annualDegradationRate}% / yr
          </div>
          <span className="text-[8px] text-emerald-400 font-medium">OPTIMAL FADE CURVE</span>
        </div>

        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            EQUIV FULL CYCLES
          </div>
          <div className="text-xs sm:text-sm font-bold text-white font-telemetry mt-0.5">
            {cycleCount.toLocaleString()} / 6,000
          </div>
          <span className="text-[8px] text-slate-400">23.6% CYCLE BUDGET</span>
        </div>

        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            INTERNAL RESISTANCE
          </div>
          <div className="text-xs sm:text-sm font-bold text-cyan-400 font-telemetry mt-0.5">
            +{resistanceGrowth}% mΩ
          </div>
          <span className="text-[8px] text-slate-400">ANODE SEI GROWTH</span>
        </div>

        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            PROJECTED EOL (80%)
          </div>
          <div className="text-xs sm:text-sm font-bold text-amber-300 font-telemetry mt-0.5">
            Q4 2031 (7.2 yrs)
          </div>
          <span className="text-[8px] text-slate-400">SAFE OPERATIONAL LIMIT</span>
        </div>
      </div>
    </div>
  );
};
