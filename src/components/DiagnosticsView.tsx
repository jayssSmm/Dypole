import React from 'react';
import { TelemetryMetrics, BatteryStatus, SeverityLevel } from '../types';
import { Activity } from 'lucide-react';

interface DiagnosticsViewProps {
  telemetry: TelemetryMetrics;
  battery?: BatteryStatus;
  dieselHealth?: number;
  severity: SeverityLevel;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  telemetry,
  battery,
  dieselHealth = 78,
  severity,
}) => {
  const diagnosticItems = [
    { name: 'Inverter #1 Microgrid Phase Lock', status: 'Optimal', val: '0.01° phase lag', healthy: true },
    { name: 'Inverter #2 Harmonic Distortion (THD)', status: 'Nominal', val: '1.12% THD', healthy: true },
    { name: 'Wind Turbine #1 Bearing Vibration', status: 'Normal', val: `${(telemetry.windSpeed * 0.03).toFixed(2)} mm/s RMS`, healthy: true },
    { name: 'Wind Turbine #2 Pitch Actuator Pressure', status: 'Normal', val: '185 bar', healthy: true },
    { name: 'Solar PV Array #1-4 Isolation Resistance', status: 'Pass', val: '> 50 MΩ', healthy: true },
    { name: 'BESS Cell Voltage Delta Max', status: 'Balanced', val: `${battery ? (battery.usable_kwh * 4).toFixed(0) : 12} mV max ΔV`, healthy: true },
    { name: 'Diesel Generator #1 Compression Ratio', status: dieselHealth > 70 ? 'Nominal' : 'Advisory', val: `${dieselHealth}% baseline`, healthy: dieselHealth > 70 },
    { name: 'SCADA Satellite Uplink Signal to Noise', status: severity === 'emergency' ? 'Storm Attenuation' : 'Strong', val: `${(45 - telemetry.syncLatency * 0.1).toFixed(1)} dB C/N0`, healthy: severity !== 'emergency' },
  ];

  return (
    <div className="hud-card p-5 font-mono">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-wide">
            Subsystem Health Diagnostics &amp; Microgrid Bus Telemetry
          </h2>
        </div>
        <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
          ALL 8 CORE SENSORS ONLINE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {diagnosticItems.map((item, idx) => (
          <div key={idx} className="hud-subpanel p-3 flex flex-col justify-between">
            <div className="text-[10px] text-slate-300 font-semibold mb-2">
              {item.name}
            </div>
            <div className="flex items-end justify-between border-t border-white/10 pt-2">
              <span className={`text-xs font-bold ${item.healthy ? 'text-emerald-400' : 'text-amber-400'}`}>
                {item.status}
              </span>
              <span className="text-[11px] text-slate-200 font-telemetry">
                {item.val}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
