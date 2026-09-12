import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { generate72HourHistory } from '../mock/mockData';
import { ScheduleResponse, DataSourceMode } from '../types';

interface ScheduleMatrixChartProps {
  schedule: ScheduleResponse;
  mode: DataSourceMode;
}

export const ScheduleMatrixChart: React.FC<ScheduleMatrixChartProps> = ({
  schedule,
  mode,
}) => {
  const [viewMode, setViewMode] = useState<'72h-history' | '12h-schedule'>('72h-history');

  const scenarioKey = mode === 'mock-blizzard' ? 'blizzard' : 'normal';
  const history72Data = generate72HourHistory(scenarioKey);

  // Map 12-hour schedule data for stacked bar/area chart
  const schedule12Data = schedule.map((item) => ({
    hourLabel: `H+${item.hour}`,
    wind: item.wind_kw,
    solar: item.solar_kw,
    bess: item.battery_kw,
    diesel: item.diesel_kw,
    demand: item.demand_kw,
    rawDemand: item.demand_kw,
    rawBatterySoc: item.battery_soc_after,
    reason: item.reason,
  }));

  return (
    <div className="hud-card p-4 sm:p-5 flex flex-col font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between border-b border-white/10 pb-3 gap-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            HISTORICAL TELEMETRY MATRIX
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Power Source Allocation &amp; AI Decisions {viewMode === '72h-history' ? '(Last 72 Hours)' : '(12-Hour Forecast Schedule)'}
          </h2>
        </div>

        {/* View Toggle & Legend */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Toggle Button */}
          <div className="inline-flex rounded-lg bg-black/30 p-1 border border-white/10 backdrop-blur-md text-[10px]">
            <button
              onClick={() => setViewMode('72h-history')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                viewMode === '72h-history'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              72H HISTORICAL
            </button>
            <button
              onClick={() => setViewMode('12h-schedule')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                viewMode === '12h-schedule'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12H SCHEDULE
            </button>
          </div>

          {/* Color Legend Matching the Image */}
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#00f0ff] border border-cyan-300 shadow-[0_0_6px_#00f0ff]"></span>
              <span className="text-slate-300 font-medium">WIND</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7] border border-sky-400 shadow-[0_0_6px_#0284c7]"></span>
              <span className="text-slate-300 font-medium">SOLAR PV</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0e7490] border border-teal-500 shadow-[0_0_6px_#0e7490]"></span>
              <span className="text-slate-300 font-medium">BESS CELLS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] border border-amber-400 shadow-[0_0_6px_#f59e0b]"></span>
              <span className="text-slate-300 font-medium">DIESEL GEN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-44 sm:h-52 w-full pt-3">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === '72h-history' ? (
            <AreaChart data={history72Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorBess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0e7490" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0e7490" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorDiesel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="rgba(255, 255, 255, 0.2)"
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                interval={4}
                tickLine={false}
              />
              <YAxis
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
                formatter={(val: number, name: string) => [`${Number(val).toFixed(1)} kW`, name.toUpperCase()]}
              />
              {/* Stacked Areas in exact layering order */}
              <Area type="monotone" dataKey="diesel" stackId="1" stroke="#f59e0b" fill="url(#colorDiesel)" />
              <Area type="monotone" dataKey="bess" stackId="1" stroke="#0e7490" fill="url(#colorBess)" />
              <Area type="monotone" dataKey="solar" stackId="1" stroke="#0284c7" fill="url(#colorSolar)" />
              <Area type="monotone" dataKey="wind" stackId="1" stroke="#00f0ff" fill="url(#colorWind)" />
            </AreaChart>
          ) : (
            <BarChart data={schedule12Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="hourLabel"
                stroke="rgba(255, 255, 255, 0.2)"
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
              />
              <YAxis
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
                formatter={(val: number, name: string) => [`${Number(val).toFixed(1)} kW`, name.toUpperCase()]}
              />
              <Bar dataKey="diesel" stackId="a" fill="#f59e0b" name="Diesel" />
              <Bar dataKey="bess" stackId="a" fill="#0e7490" name="BESS" />
              <Bar dataKey="solar" stackId="a" fill="#0284c7" name="Solar" />
              <Bar dataKey="wind" stackId="a" fill="#00f0ff" name="Wind" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Axis Reference Markers */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[9px] text-slate-400 font-medium">
        <span>T -72 HOURS</span>
        <span>T -48 HOURS</span>
        <span>T -24 HOURS</span>
        <span>T -12 HOURS</span>
        <span className="text-cyan-400 font-bold">CURRENT DISPATCH (T-0)</span>
      </div>
    </div>
  );
};
