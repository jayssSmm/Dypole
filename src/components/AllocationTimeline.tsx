import React from 'react';
import { ScheduleResponse } from '../types';
import { Bot } from 'lucide-react';

interface AllocationTimelineProps {
  schedule: ScheduleResponse;
}

export const AllocationTimeline: React.FC<AllocationTimelineProps> = ({ schedule }) => {
  // Render newest first (descending hour or reverse order)
  const reversedSchedule = [...schedule].reverse();

  return (
    <div className="hud-card p-4 sm:p-5 flex flex-col font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              AI DECISION JOURNAL
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Hourly Dispatch Allocation Log (Newest First)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>12H HORIZON ACTIVE</span>
        </div>
      </div>

      {/* Scrollable list of decisions */}
      <div className="flex flex-col gap-2.5 my-3 overflow-y-auto max-h-64 pr-1">
        {reversedSchedule.map((item) => {
          const isDieselActive = item.diesel_kw > 0;
          const isBatteryDischarging = item.battery_kw > 0;

          return (
            <div
              key={item.hour}
              className="p-3 rounded-lg bg-white/[0.03] backdrop-blur-md border border-white/[0.06] hover:border-cyan-400/40 hover:bg-white/[0.06] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              {/* Left: Hour & Reason */}
              <div className="flex items-start gap-3">
                <div className="px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 font-telemetry font-bold text-[11px] whitespace-nowrap shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                  H+{item.hour}
                </div>
                <div>
                  <p className="text-xs text-slate-100 font-sans font-medium">
                    {item.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>Demand: <strong className="text-white font-telemetry">{item.demand_kw.toFixed(1)} kW</strong></span>
                    <span>•</span>
                    <span>Est SOC: <strong className="text-cyan-300 font-telemetry">{item.battery_soc_after.toFixed(1)} kWh</strong></span>
                  </div>
                </div>
              </div>

              {/* Right: Sources Pills */}
              <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center text-[10px]">
                {item.solar_kw > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-400/40 text-sky-300 font-telemetry shadow-[0_0_6px_rgba(2,132,199,0.3)]">
                    Solar {item.solar_kw.toFixed(1)}kW
                  </span>
                )}
                {item.wind_kw > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 font-telemetry shadow-[0_0_6px_rgba(0,240,255,0.3)]">
                    Wind {item.wind_kw.toFixed(1)}kW
                  </span>
                )}
                {isBatteryDischarging && (
                  <span className="px-2 py-0.5 rounded-md bg-teal-950/60 border border-teal-400/40 text-teal-300 font-telemetry shadow-[0_0_6px_rgba(14,116,144,0.3)]">
                    BESS {item.battery_kw.toFixed(1)}kW
                  </span>
                )}
                {isDieselActive && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-400/40 text-amber-300 font-telemetry font-bold shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                    Diesel {item.diesel_kw.toFixed(1)}kW
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
