import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { generate24HourForecast } from '../mock/mockData';
import { TelemetryMetrics, DataSourceMode } from '../types';

interface LoadForecastChartProps {
  mode: DataSourceMode;
  telemetry: TelemetryMetrics;
}

export const LoadForecastChart: React.FC<LoadForecastChartProps> = ({
  mode,
  telemetry,
}) => {
  const scenarioKey = mode === 'mock-blizzard' ? 'blizzard' : 'normal';
  const data = generate24HourForecast(scenarioKey);

  const peakVal = mode === 'mock-blizzard' ? '338.2 kW' : '226.5 kW';
  const minVal = mode === 'mock-blizzard' ? '322.0 kW' : '214.2 kW';
  const solarElev = mode === 'mock-blizzard' ? '0.0°' : `${telemetry.solarElevation}° MAX`;
  const windProj = `${telemetry.katabaticWindProj} kt GUSTS`;

  const yDomain = mode === 'mock-blizzard' ? [280, 370] : [180, 260];
  const thresholdVal = mode === 'mock-blizzard' ? 350 : 250;
  const thresholdLabel = mode === 'mock-blizzard' ? 'CRITICAL LIMIT 350kW' : 'PEAK THRESHOLD 250kW';

  return (
    <div className="hud-card p-4 sm:p-5 flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between border-b border-white/10 pb-3 gap-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            PREDICTIVE ENERGY MODELING
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Actual vs Forecasted Power Load (24-Hour Horizon)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-md border border-cyan-400/40 bg-cyan-950/40 text-cyan-300 text-[10px] font-bold shadow-[0_0_8px_rgba(0,240,255,0.15)]">
            CONFIDENCE INTERVAL: 95.4%
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400"></span> ACTUAL
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 border-b border-dashed border-cyan-300"></span> PREDICTED
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart + Right KPI Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center my-auto py-2">
        {/* Chart */}
        <div className="lg:col-span-8 h-48 sm:h-52 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="time"
                stroke="rgba(255, 255, 255, 0.2)"
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                interval={3}
                tickLine={false}
              />
              <YAxis
                domain={yDomain}
                stroke="rgba(255, 255, 255, 0.2)"
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(25, 25, 25, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
                formatter={(val: number, name: string) => [
                  `${Number(val).toFixed(1)} kW`,
                  name === 'actual' ? 'Actual Load' : 'Predicted Load',
                ]}
              />

              {/* Threshold line */}
              <ReferenceLine
                y={thresholdVal}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: thresholdLabel,
                  fill: '#f59e0b',
                  fontSize: 8,
                  position: 'insideTopRight',
                  fontFamily: 'monospace',
                }}
              />

              {/* NOW marker line */}
              <ReferenceLine
                x="NOW (T-0)"
                stroke="#00f0ff"
                strokeWidth={1.5}
                label={{
                  value: 'NOW (T-0)',
                  fill: '#00f0ff',
                  fontSize: 8,
                  position: 'top',
                  fontFamily: 'monospace',
                }}
              />

              {/* Actual curve */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#00f0ff"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#00f0ff', stroke: '#fff' }}
              />

              {/* Predicted curve */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#38bdf8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Right KPI Column */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5 border-t lg:border-t-0 lg:border-l border-white/10 pt-2 lg:pt-0 lg:pl-3">
          <div className="hud-subpanel p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
              ESTIMATED PEAK (+8H)
            </div>
            <div className="text-sm font-bold text-white font-telemetry tracking-tight">
              {peakVal}
            </div>
          </div>

          <div className="hud-subpanel p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
              MIN FORECAST (+19H)
            </div>
            <div className="text-sm font-bold text-cyan-400 font-telemetry tracking-tight">
              {minVal}
            </div>
          </div>

          <div className="hud-subpanel p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
              SOLAR ELEVATION
            </div>
            <div className="text-sm font-bold text-slate-200 font-telemetry tracking-tight">
              {solarElev}
            </div>
          </div>

          <div className="hud-subpanel p-2.5 border-amber-500/20 bg-amber-950/10">
            <div className="text-[9px] uppercase tracking-wider text-amber-400/90 font-medium flex items-center gap-1">
              <span>KATABATIC WIND PROJ</span>
            </div>
            <div className="text-sm font-bold text-amber-400 font-telemetry tracking-tight">
              {windProj}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
