import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Layers, Thermometer, Activity, ShieldCheck } from 'lucide-react';
import { getCellHealthColor } from '../../../data/initialData';

export default function BatteryHUD({
  cells,
  selectedCell,
  onSelectCell,
  exploded,
  onToggleExploded,
  onOptimizeBanks,
}) {
  const flaggedCount = cells.filter((c) => c.soh < 60).length;
  const avgTemp = (cells.reduce((acc, c) => acc + c.temp, 0) / cells.length).toFixed(1);
  const avgSoh = Math.round(cells.reduce((acc, c) => acc + c.soh, 0) / cells.length);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 top-20 z-10 flex flex-col justify-between gap-3 lg:bottom-4 lg:flex-row lg:items-start">
      {/* LEFT PANEL: Dual-Bank Architecture & Cell Matrix */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[46vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-[352px]"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Battery Intelligence</h2>
            <p className="text-[11px] font-medium text-slate-500">Dual-Bank 3D Technical Cutaway</p>
          </div>
          <button
            onClick={onOptimizeBanks}
            className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 active:scale-95"
          >
            <Wrench className="h-3.5 w-3.5" />
            Optimize Banks
          </button>
        </div>

        {/* Dual Bank Allocation Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-emerald-200/90 bg-white/85 p-3">
            <div className="text-[10px] font-bold uppercase text-emerald-600">Bank Alpha</div>
            <div className="text-xs font-extrabold text-slate-900">Main Traction</div>
            <div className="mt-1 font-mono text-2xl font-black text-emerald-600">80%</div>
            <div className="mt-1 text-[10px] text-slate-500">SoH 94% · 1,247 cycles · 28°C</div>
          </div>

          <div className="rounded-xl border border-sky-200/90 bg-white/85 p-3">
            <div className="text-[10px] font-bold uppercase text-sky-600">Bank Beta</div>
            <div className="text-xs font-extrabold text-slate-900">Aux Reserve</div>
            <div className="mt-1 font-mono text-2xl font-black text-sky-600">20%</div>
            <div className="mt-1 text-[10px] text-slate-500">SoH 98% · 382 cycles · 24°C</div>
          </div>
        </div>

        <button
          onClick={onToggleExploded}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <Layers className="h-3.5 w-3.5 text-sky-600" />
          {exploded ? 'Collapse Cutaway Assembly' : 'Expand Exploded 3D View'}
        </button>

        {/* 32-Cell Interactive Mini Selector */}
        <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Bank Alpha · 32 Cells</span>
            <span className="text-red-500">{flaggedCount} flagged</span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {cells.map((c) => {
              const color = getCellHealthColor(c.soh);
              const isSelected = selectedCell?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCell(c)}
                  title={`Cell ${c.id}: ${c.soh}%`}
                  className={`flex aspect-square items-center justify-center rounded-md font-mono text-[9px] font-bold text-white transition hover:scale-110 ${
                    isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {c.soh}
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> &gt;85% Good
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 60–85% Warn
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> &lt;60% Critical
            </span>
          </div>
        </div>
      </motion.aside>

      {/* RIGHT PANEL: Health Summary & Selected 3D Cell Telemetry */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.28 }}
        className="pointer-events-auto hidden w-72 flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:flex"
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Pack Diagnostics
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/85 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span className="text-xs font-semibold text-slate-700">State of Health</span>
            </div>
            <span className="font-mono text-sm font-extrabold text-sky-600">
              {Math.max(94, avgSoh)}%
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/85 p-3">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">Avg Cell Temp</span>
            </div>
            <span className="font-mono text-sm font-extrabold text-emerald-600">{avgTemp}°C</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/85 p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-700">Optimization Score</span>
            </div>
            <span className="font-mono text-sm font-extrabold text-amber-600">97%</span>
          </div>
        </div>

        {selectedCell && (
          <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">Cell #{selectedCell.id}</span>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-white"
                style={{ backgroundColor: getCellHealthColor(selectedCell.soh) }}
              >
                {selectedCell.soh}% SoH
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
              <div>
                <div className="text-[9px] text-slate-400">Temp</div>
                <div className="font-mono font-bold text-slate-800">{selectedCell.temp}°C</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">Voltage</div>
                <div className="font-mono font-bold text-slate-800">{selectedCell.voltage}V</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">Cycles</div>
                <div className="font-mono font-bold text-slate-800">{selectedCell.cycles}</div>
              </div>
            </div>
          </div>
        )}
      </motion.aside>
    </div>
  );
}
