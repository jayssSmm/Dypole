import React from 'react';
import { Battery } from 'lucide-react';
import { BatteryStatus, TelemetryMetrics } from '../types';

interface BatteryCardProps {
  battery?: BatteryStatus;
  telemetry: TelemetryMetrics;
}

export const BatteryCard: React.FC<BatteryCardProps> = ({
  battery,
  telemetry,
}) => {
  // Use data contract values
  const capacity = battery?.capacity_kwh ?? 5.4;
  const current = battery?.current_kwh ?? 3.3;
  const usable = battery?.usable_kwh ?? 2.6;
  const dischargeKw = battery?.discharge_kw ?? 1.1;

  // Percentage calculation
  const socPct = Math.round((current / capacity) * 100);

  // Autonomy calculation based on usable kWh / discharge kW
  let autonomyHours = 22;
  let autonomyMins = 15;
  if (dischargeKw > 0) {
    const totalHours = usable / dischargeKw;
    autonomyHours = Math.floor(totalHours);
    autonomyMins = Math.round((totalHours - autonomyHours) * 60);
  }

  const isDischarging = dischargeKw > 0;
  const statusLabel = isDischarging ? 'DISCHARGING' : 'STANDBY / FLOAT';

  // Segment bar rendering (20 segments total)
  const totalSegments = 20;
  const filledSegments = Math.round((socPct / 100) * totalSegments);

  return (
    <div className="hud-card p-3 sm:p-3.5 flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Battery className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
            BESS Storage Array
          </h3>
        </div>

        <div className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border bg-cyan-950/60 border-cyan-400/80 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.25)]">
          {statusLabel}
        </div>
      </div>

      {/* SOC & Compact Segment Bar */}
      <div className="my-1.5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
            STATE OF CHARGE (SOC)
          </span>
          <span className="text-xl sm:text-2xl font-black text-cyan-300 font-telemetry glow-cyan-text leading-none">
            {socPct}%
          </span>
        </div>

        {/* Compact Segmented Meter Bar */}
        <div className="grid grid-cols-20 gap-0.5 p-1 rounded-md bg-black/40 border border-white/10 backdrop-blur-md">
          {Array.from({ length: totalSegments }).map((_, i) => {
            const isFilled = i < filledSegments;
            return (
              <div
                key={i}
                className={`h-2.5 rounded-[1px] transition-all duration-300 ${
                  isFilled
                    ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)]'
                    : 'bg-white/[0.05]'
                }`}
              />
            );
          })}
        </div>

        {/* Range Labels below Bar */}
        <div className="flex items-center justify-between mt-1 text-[8.5px] text-slate-400 font-semibold tracking-wider">
          <span>0%</span>
          <span className="text-slate-300 font-telemetry">
            {current.toFixed(1)} / {capacity.toFixed(1)} kWh ({usable.toFixed(1)} kWh USABLE)
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* 2x2 Compact Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            DISCHARGE FLOW
          </div>
          <div className="text-xs sm:text-sm font-bold text-cyan-300 font-telemetry mt-0.5">
            {isDischarging ? `-${dischargeKw.toFixed(1)} kW` : '0.0 kW'}
          </div>
        </div>

        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            RUN AUTONOMY
          </div>
          <div className="text-xs sm:text-sm font-bold text-white font-telemetry mt-0.5">
            {autonomyHours}h {autonomyMins}m
          </div>
        </div>

        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            INTERNAL CELL TEMP
          </div>
          <div className="text-xs sm:text-sm font-bold text-cyan-400 font-telemetry mt-0.5">
            +{telemetry.internalCellTemp.toFixed(1)}°C
          </div>
        </div>

        <div className="hud-subpanel p-1.5 sm:p-2">
          <div className="text-[8.5px] uppercase text-slate-400 tracking-wider">
            HEALTH CYCLE INDEX
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-200 font-telemetry mt-0.5">
            {telemetry.healthCycleIndex.toFixed(1)}% SOH
          </div>
        </div>
      </div>
    </div>
  );
};

