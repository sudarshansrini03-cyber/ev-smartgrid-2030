import React from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, Car, Plug, Sun, Activity, Bot } from 'lucide-react';
import { AI_RECOMMENDATIONS } from '../../../data/initialData';

export default function DashboardHUD({
  stats,
  onSimulateCity,
  onApplyRecommendation,
  onOpenNeuroTwin,
  aiAdvice,
  aiLoading,
}) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 top-20 z-10 flex flex-col justify-between gap-3 lg:bottom-4 lg:flex-row lg:items-start">
      {/* LEFT GLASS PANEL: KPIs + Energy Levels */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[44vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-80"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Mumbai Metro Zone</h2>
            <p className="text-[11px] font-medium text-slate-500">Live Load Balancing Telemetry</p>
          </div>
          <button
            onClick={onSimulateCity}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Simulate City
          </button>
        </div>

        {/* 4 Live KPI Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>EVs Connected</span>
              <Car className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 font-mono text-xl font-extrabold text-emerald-600">
              {stats.evs.toLocaleString()}
            </div>
            <div className="text-[10px] font-medium text-slate-500">↑ 142 from last hr</div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Active Chargers</span>
              <Plug className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-1 font-mono text-xl font-extrabold text-amber-600">
              {stats.chargers}
            </div>
            <div className="text-[10px] font-medium text-slate-500">↑ 23 since 6 AM</div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Solar Gen</span>
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-1 font-mono text-xl font-extrabold text-sky-600">
              {stats.solar}%
            </div>
            <div className="text-[10px] font-medium text-slate-500">Peak: 142 MW</div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Grid Demand</span>
              <Activity className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="mt-1 font-mono text-xl font-extrabold text-red-500">
              {stats.demand}%
            </div>
            <div className="text-[10px] font-medium text-slate-500">↓ 8% vs yesterday</div>
          </div>
        </div>

        {/* Energy Management Live Bars */}
        <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Energy Management – Live Levels
          </div>
          {[
            { label: 'Solar Power', val: stats.solar, color: 'bg-amber-500' },
            { label: 'Grid Demand', val: stats.demand, color: 'bg-red-500' },
            { label: 'Battery Storage', val: stats.batt, color: 'bg-emerald-500' },
            { label: 'Renewable Mix', val: stats.renew, color: 'bg-sky-600' },
          ].map((item) => (
            <div key={item.label} className="mb-2 last:mb-0">
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700">
                <span>{item.label}</span>
                <span className="font-mono font-bold text-slate-900">{item.val}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                  style={{ width: `${item.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.aside>

      {/* RIGHT GLASS PANEL: AI Recommendations & Advisor */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto hidden max-h-[calc(100vh-6.5rem)] w-80 flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:flex"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>NEURO TWIN RECOMMENDATIONS</span>
          </div>
          <button
            onClick={onOpenNeuroTwin}
            disabled={aiLoading}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
          >
            <Bot className="h-3 w-3" />
            {aiLoading ? 'Analyzing…' : 'Ask Neuro Twin'}
          </button>
        </div>

        {aiAdvice && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/85 p-3 text-[11px] leading-relaxed text-slate-800">
            <div className="mb-1 font-bold text-sky-700">Live BMS Neuro Twin Advisory</div>
            {aiAdvice}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {AI_RECOMMENDATIONS.map((rec) => (
            <button
              key={rec.id}
              onClick={() => onApplyRecommendation(rec.toastMsg)}
              className="group rounded-xl border border-slate-200/90 bg-white/85 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                {rec.title}
              </div>
              <div className="mt-1 text-[11px] leading-snug text-slate-600">{rec.desc}</div>
              <div className="mt-1.5 text-[10px] font-bold text-emerald-600">↑ {rec.gain}</div>
            </button>
          ))}
        </div>
      </motion.aside>
    </div>
  );
}
