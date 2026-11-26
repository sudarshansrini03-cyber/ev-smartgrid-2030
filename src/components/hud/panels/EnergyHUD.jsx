import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Leaf } from 'lucide-react';

export default function EnergyHUD({ energyMetrics, loadBars, routes, onBalanceGrid }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 top-20 z-10 flex flex-col justify-between gap-3 lg:bottom-4 lg:flex-row lg:items-start">
      {/* LEFT PANEL: Live Grid Load Balancing */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[44vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-80"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Energy & Solar Grid</h2>
            <p className="text-[11px] font-medium text-slate-500">Renewable Routing & Balancing</p>
          </div>
          <button
            onClick={onBalanceGrid}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-95"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            Balance Grid Now
          </button>
        </div>

        {/* 3 Live Output Metric Tiles */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/75 p-2.5">
            <div className="text-[9px] font-bold uppercase text-amber-700">Solar</div>
            <div className="mt-0.5 font-mono text-sm font-extrabold text-slate-900">
              {energyMetrics.solarMw} MW
            </div>
          </div>
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/75 p-2.5">
            <div className="text-[9px] font-bold uppercase text-sky-700">Grid Draw</div>
            <div className="mt-0.5 font-mono text-sm font-extrabold text-slate-900">
              {energyMetrics.gridMw} MW
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/75 p-2.5">
            <div className="text-[9px] font-bold uppercase text-emerald-700">Reserve</div>
            <div className="mt-0.5 font-mono text-sm font-extrabold text-slate-900">
              {energyMetrics.battReserveKwh} kWh
            </div>
          </div>
        </div>

        {/* Load Balancing Progress Bars */}
        <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Real-Time Grid Load Balancing
          </div>
          {[
            { label: 'Solar Feed-in', val: loadBars.solarFeed, color: 'bg-amber-500' },
            { label: 'Grid Draw', val: loadBars.gridDraw, color: 'bg-sky-600' },
            { label: 'Battery Dispatch', val: loadBars.battDispatch, color: 'bg-emerald-500' },
            { label: 'Industrial Load', val: loadBars.industrial, color: 'bg-red-500' },
          ].map((b) => (
            <div key={b.label} className="mb-2 last:mb-0">
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700">
                <span>{b.label}</span>
                <span className="font-mono font-bold text-slate-900">{b.val}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${b.color}`}
                  style={{ width: `${b.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.aside>

      {/* RIGHT PANEL: Energy Routing Channels & Carbon Impact */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.28 }}
        className="pointer-events-auto hidden w-80 flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:flex"
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Energy Routing Channels
        </div>

        <div className="flex flex-col gap-2">
          {routes.map((route) => (
            <div
              key={route.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/85 p-3 shadow-sm"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">{route.title}</div>
                <div className="text-[11px] text-slate-500">{route.desc}</div>
              </div>
              <div
                className="font-mono text-base font-extrabold"
                style={{ color: route.color }}
              >
                {route.pct}%
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/75 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Leaf className="h-3.5 w-3.5" />
            Carbon Impact Today
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-slate-500">CO₂ Avoided</div>
              <div className="font-mono text-xs font-extrabold text-slate-900">4.2 Tonnes</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Trees Equiv.</div>
              <div className="font-mono text-xs font-extrabold text-slate-900">192</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Cost Saved</div>
              <div className="font-mono text-xs font-extrabold text-emerald-700">₹18,420</div>
            </div>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
