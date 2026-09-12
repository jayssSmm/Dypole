import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ScheduleHour } from '../types';

interface SourceMixCardProps {
  currentHourData?: ScheduleHour;
  peakCapacity?: number;
}

export const SourceMixCard: React.FC<SourceMixCardProps> = ({
  currentHourData,
  peakCapacity = 280.0,
}) => {
  // Use direct dispatch kW values from schedule contract
  const windKw = currentHourData ? currentHourData.wind_kw : 124.0;
  const solarKw = currentHourData ? currentHourData.solar_kw : 95.0;
  const bessKw = currentHourData ? currentHourData.battery_kw : 0.0;
  const dieselKw = currentHourData ? currentHourData.diesel_kw : 0.0;

  const totalLoad = Number((windKw + solarKw + bessKw + dieselKw).toFixed(1));
  const renewableKw = windKw + solarKw + bessKw;
  const renewablePct = totalLoad > 0 ? Math.round((renewableKw / totalLoad) * 100) : 0;

  const data = [
    { name: 'WIND-TURBINE', value: windKw, color: '#00f0ff', hex: '#00f0ff', pct: totalLoad > 0 ? Math.round((windKw / totalLoad) * 100) : 0 },
    { name: 'SOLAR PV ARRAY', value: solarKw, color: '#0284c7', hex: '#0284c7', pct: totalLoad > 0 ? Math.round((solarKw / totalLoad) * 100) : 0 },
    { name: 'BESS STORAGE', value: bessKw, color: '#0891b2', hex: '#0891b2', pct: totalLoad > 0 ? Math.round((bessKw / totalLoad) * 100) : 0 },
    { name: 'DIESEL', value: dieselKw, color: '#f59e0b', hex: '#f59e0b', pct: totalLoad > 0 ? Math.round((dieselKw / totalLoad) * 100) : 0 },
  ];

  return (
    <div className="hud-card p-4 sm:p-5 flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            CURRENT GENERATION DISPATCH
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Power Source Allocation
          </h2>
        </div>

        <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider border backdrop-blur-md ${
          renewablePct >= 70
            ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.35)]'
            : renewablePct >= 40
            ? 'bg-blue-950/70 border-blue-400 text-blue-300'
            : 'bg-amber-950/70 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
        }`}>
          {renewablePct}% RENEWABLE
        </div>
      </div>

      {/* Main Content: Donut + Legend */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center my-auto py-2">
        {/* Donut Chart with Center Readout */}
        <div className="md:col-span-6 relative flex items-center justify-center min-h-[170px]">
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={74}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#1e1e1e"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
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
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => [`${Number(value).toFixed(1)} kW`, 'Dispatch']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Central Total Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[9px] text-slate-400 tracking-wider font-semibold">TOTAL LOAD</span>
            <span className="text-xl sm:text-2xl font-black text-white font-telemetry tracking-tight glow-cyan-text">
              {totalLoad}
            </span>
            <span className="text-[8px] text-cyan-400 font-bold tracking-widest">KILOWATTS</span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="md:col-span-6 flex flex-col gap-2.5 pl-0 md:pl-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-4 rounded-sm shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: item.color, color: item.color }}
                ></span>
                <span className="text-slate-300 font-medium text-[11px] tracking-wider">
                  {item.name}
                </span>
              </div>
              <div className="text-right">
                <span className="font-telemetry font-bold text-slate-100 text-[11px]">
                  {item.value.toFixed(1)} kW
                </span>
                <span className="text-slate-400 text-[10px] ml-1.5">
                  ({item.pct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 pt-2.5 flex items-center justify-between text-[10px] text-slate-400">
        <span className="tracking-wider">ISLAND FEEDER: 3-PHASE 415V / 50HZ</span>
        <span className="font-semibold text-slate-300">
          PEAK CAPACITY: <strong className="text-cyan-400 font-telemetry">{peakCapacity.toFixed(1)} kW</strong>
        </span>
      </div>
    </div>
  );
};
