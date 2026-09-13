import React, { useState, useMemo } from 'react';
import {
  Sun,
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
import { TelemetryMetrics } from '../types';

interface PVSiliconDegradationCardProps {
  telemetry: TelemetryMetrics;
}

type PVTimeframeOption = '5y' | '10y' | '25y';

export const PVSiliconDegradationCard: React.FC<PVSiliconDegradationCardProps> = ({
  telemetry,
}) => {
  const [timeframe, setTimeframe] = useState<PVTimeframeOption>('10y');

  const ratedPVCapacityKw = 42.0;
  // Dynamic efficiency with slight variance according to solar elevation
  const currentPVEfficiency = 97.4 + (telemetry.solarElevation > 10 ? 0.2 : -0.1);

  // Generate PV Silicon degradation dataset based on selected timeframe
  const chartData = useMemo(() => {
    if (timeframe === '5y') {
      return [
        { period: 'Yr 0 (Install)', efficiency: 100.0, output: 42.0, standard: 100.0, lidLoss: 0.0 },
        { period: 'Yr 1 (Post-LID)', efficiency: 98.4, output: 41.3, standard: 97.5, lidLoss: 1.2 },
        { period: 'Yr 2', efficiency: 97.9, output: 41.1, standard: 97.0, lidLoss: 1.2 },
        { period: 'Yr 3 (Now)', efficiency: currentPVEfficiency, output: +(ratedPVCapacityKw * (currentPVEfficiency / 100)).toFixed(1), standard: 96.5, lidLoss: 1.2 },
        { period: 'Yr 4 (Proj)', efficiency: 96.9, output: 40.7, standard: 96.0, lidLoss: 1.2 },
        { period: 'Yr 5 (Proj)', efficiency: 96.4, output: 40.5, standard: 95.5, lidLoss: 1.2 },
      ];
    } else if (timeframe === '10y') {
      return [
        { period: 'Yr 0', efficiency: 100.0, output: 42.0, standard: 100.0 },
        { period: 'Yr 2', efficiency: 97.9, output: 41.1, standard: 97.0 },
        { period: 'Yr 4', efficiency: 96.9, output: 40.7, standard: 96.0 },
        { period: 'Yr 6', efficiency: 95.8, output: 40.2, standard: 95.0 },
        { period: 'Yr 8', efficiency: 94.7, output: 39.8, standard: 94.0 },
        { period: 'Yr 10', efficiency: 93.6, output: 39.3, standard: 93.0 },
      ];
    } else {
      // 25-Year Warranty lifecycle
      return [
        { period: 'Yr 0', efficiency: 100.0, output: 42.0, standard: 100.0 },
        { period: 'Yr 5', efficiency: 96.4, output: 40.5, standard: 95.5 },
        { period: 'Yr 10', efficiency: 93.6, output: 39.3, standard: 93.0 },
        { period: 'Yr 15', efficiency: 90.8, output: 38.1, standard: 90.5 },
        { period: 'Yr 20', efficiency: 87.9, output: 36.9, standard: 88.0 },
        { period: 'Yr 25', efficiency: 84.8, output: 35.6, standard: 85.0 },
      ];
    }
  }, [timeframe, currentPVEfficiency]);

  const annualDegradationRate = 0.48; // % / year for N-type TOPCon Monocrystalline silicon in Antarctica
  const albedoBoost = 14.8; // % boost due to pure Antarctic snow reflection

  return (
    <div className="hud-card p-4 sm:p-5 flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-950/70 border border-amber-400/50 flex items-center justify-center text-amber-400">
            <Sun className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              PV Silicon Degradation vs Time
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-400/40">
                N-TYPE TOPCon
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Photovoltaic wafer efficiency fade, UV LID resistance &amp; polar albedo yield
            </p>
          </div>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-[10px]">
          {(['5y', '10y', '25y'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded transition-all uppercase font-semibold ${
                timeframe === tf
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf === '25y' ? '25Y (WARRANTY)' : tf}
            </button>
          ))}
        </div>
      </div>

      {/* Degradation Chart */}
      <div className="my-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-amber-400" />
              SILICON WAFER EFFICIENCY FADE
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 text-[10px]">
              RETAINED EFFICIENCY:{' '}
              <strong className="text-amber-300 font-telemetry text-sm glow-amber-text">
                {currentPVEfficiency.toFixed(1)}%
              </strong>
            </span>
            <span className="text-slate-400 text-[10px]">
              PEAK OUTPUT:{' '}
              <strong className="text-white font-telemetry">
                {(ratedPVCapacityKw * (currentPVEfficiency / 100)).toFixed(1)} / {ratedPVCapacityKw} kW
              </strong>
            </span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-44 w-full bg-black/20 rounded-lg p-2 border border-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pvStdGradient" x1="0" y1="0" x2="0" y2="1">
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
                domain={[80, 102]}
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#181818',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}
                formatter={(value: any, name: string) => [
                  `${Number(value).toFixed(1)}%`,
                  name === 'efficiency' ? 'Measured Silicon Efficiency' : 'Industry Standard Tier-1 Line',
                ]}
                labelFormatter={(label) => `Timeline: ${label}`}
              />
              <ReferenceLine y={84.8} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '25Y WARRANTY LIMIT (84.8%)', fill: '#f59e0b', fontSize: 8, position: 'insideBottomRight' }} />
              <Area
                type="monotone"
                dataKey="standard"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#pvStdGradient)"
                name="standard"
              />
              <Area
                type="monotone"
                dataKey="efficiency"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#pvGradient)"
                name="efficiency"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Degradation Diagnostics Subpanels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-white/10 pt-3">
        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            ANNUAL FADE RATE
          </div>
          <div className="text-xs sm:text-sm font-bold text-amber-300 font-telemetry mt-0.5">
            -{annualDegradationRate}% / yr
          </div>
          <span className="text-[8px] text-emerald-400 font-medium">TIER-1 BENCHMARK</span>
        </div>

        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            INITIAL LID LOSS
          </div>
          <div className="text-xs sm:text-sm font-bold text-white font-telemetry mt-0.5">
            1.2% (STABILIZED)
          </div>
          <span className="text-[8px] text-slate-400">BO-LID IMMUNE WAFER</span>
        </div>

        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            SNOW ALBEDO BOOST
          </div>
          <div className="text-xs sm:text-sm font-bold text-cyan-300 font-telemetry mt-0.5">
            +{albedoBoost}% GAIN
          </div>
          <span className="text-[8px] text-cyan-400">BIFACIAL REAR YIELD</span>
        </div>

        <div className="hud-subpanel p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            YR 25 REMAINING
          </div>
          <div className="text-xs sm:text-sm font-bold text-amber-300 font-telemetry mt-0.5">
            35.6 kW (84.8%)
          </div>
          <span className="text-[8px] text-slate-400">WARRANTY COMPLIANT</span>
        </div>
      </div>
    </div>
  );
};
