import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Zap } from 'lucide-react';
import { CHARGING_STATIONS_OPTIONS } from '../../../data/initialData';

export default function ChargingHUD({
  vehicles,
  chargingState,
  onChangeVehicle,
  onChangeStationKw,
  onChangeStartSoc,
  onChangeTargetSoc,
  onStartCharging,
  onStopCharging,
}) {
  const {
    selectedVehicleId,
    stationKw,
    startSoC,
    targetSoC,
    currentSoC,
    energyUsed,
    timeLeftMin,
    estCost,
    isCharging,
  } = chargingState;

  const totalNeeded = Math.max(1, targetSoC - startSoC);
  const done = Math.max(0, currentSoC - startSoC);
  const progressPct = isCharging || done > 0 ? Math.min(100, Math.round((done / totalNeeded) * 100)) : 0;
  const sliderPct = ((targetSoC - 20) / 80) * 100;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 top-20 z-10 flex flex-col justify-between gap-3 lg:bottom-4 lg:flex-row lg:items-start">
      {/* LEFT PANEL: Session Configuration */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[42vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-80"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Smart Charging Control</h2>
            <p className="text-[11px] font-medium text-slate-500">3D Charging Bay Simulator</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isCharging ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {isCharging ? '⚡ Charging' : '● Ready'}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Select Vehicle
            </label>
            <select
              value={selectedVehicleId}
              disabled={isCharging}
              onChange={(e) => onChangeVehicle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} · {v.model} (SoC: {v.soc}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Charging Station
            </label>
            <select
              value={stationKw}
              disabled={isCharging}
              onChange={(e) => onChangeStationKw(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              {CHARGING_STATIONS_OPTIONS.map((opt) => (
                <option key={opt.kw} value={opt.kw}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Starting SoC
            </label>
            <select
              value={vehicles.some((v) => v.id === selectedVehicleId && v.soc === startSoC) ? selectedVehicleId : '__custom__'}
              disabled={isCharging}
              onChange={(e) => {
                const picked = vehicles.find((v) => v.id === e.target.value);
                if (picked) {
                  onChangeVehicle(picked.id);
                } else {
                  onChangeStartSoc(startSoC);
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.soc}% – {v.model}
                </option>
              ))}
              {!vehicles.some((v) => v.id === selectedVehicleId && v.soc === startSoC) && (
                <option value="__custom__">{startSoC}% – Custom</option>
              )}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Target Battery</span>
              <span className="font-mono text-xs text-emerald-600">{targetSoC}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={targetSoC}
              onChange={(e) => onChangeTargetSoc(Number(e.target.value))}
              className="studio-slider"
              style={{
                background: `linear-gradient(90deg, #10B981 ${sliderPct}%, #E2E8F0 ${sliderPct}%)`,
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {!isCharging ? (
            <button
              onClick={onStartCharging}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start Charging
            </button>
          ) : (
            <button
              onClick={() => onStopCharging(false)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-600"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop Charging
            </button>
          )}
        </div>
      </motion.aside>

      {/* RIGHT PANEL: Live Telemetry Readouts */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.28 }}
        className="pointer-events-auto flex w-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:w-80"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Live Session Telemetry
          </span>
          <Zap className={`h-4 w-4 ${isCharging ? 'animate-pulse text-sky-600' : 'text-slate-400'}`} />
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3.5 text-center">
          <div className="font-mono text-4xl font-black text-slate-900">
            {Math.round(currentSoC)}%
          </div>
          <div className="text-[11px] font-semibold text-slate-500">State of Charge</div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600">
              <span>Charging Progress</span>
              <span className="font-mono font-bold text-emerald-600">{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Power</div>
            <div className="mt-0.5 font-mono text-lg font-extrabold text-sky-600">
              {isCharging ? `${stationKw}` : '–'} <span className="text-xs font-semibold">kW</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Energy Used</div>
            <div className="mt-0.5 font-mono text-lg font-extrabold text-slate-900">
              {energyUsed.toFixed(1)} <span className="text-xs font-semibold text-slate-500">kWh</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Time Remaining</div>
            <div className="mt-0.5 font-mono text-base font-extrabold text-slate-900">
              {isCharging ? (timeLeftMin > 0 ? `${timeLeftMin} min` : 'Done!') : '–'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Est. Cost</div>
            <div className="mt-0.5 font-mono text-lg font-extrabold text-emerald-600">
              ₹{estCost}
            </div>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
