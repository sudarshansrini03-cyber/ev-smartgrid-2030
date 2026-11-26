import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Zap, Link2, CheckCircle2 } from 'lucide-react';
import { getSoCCategoryColor } from '../../../data/initialData';

export default function VehiclesHUD({ vehicles, selectedVehicleId, onSelectVehicle, onAddVehicle }) {
  const selected = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 top-20 z-10 flex flex-col justify-between gap-3 lg:bottom-4 lg:flex-row lg:items-start">
      {/* LEFT PANEL: Connected Fleet Table */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[46vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-[460px]"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">EV Vehicles Monitor</h2>
            <p className="text-[11px] font-medium text-slate-500">
              Click any vehicle to inspect on the 3D studio turntable
            </p>
          </div>
          <button
            onClick={onAddVehicle}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add EV Vehicle
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/85">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5">Vehicle</th>
                <th className="px-3 py-2.5">SoC</th>
                <th className="px-3 py-2.5">Station</th>
                <th className="px-3 py-2.5">Range</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((ev) => {
                const isSelected = ev.id === selected?.id;
                const socColor = getSoCCategoryColor(ev.soc);
                return (
                  <tr
                    key={ev.id}
                    onClick={() => onSelectVehicle(ev.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50/90' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-[11px] font-bold text-sky-700">{ev.id}</div>
                      <div className="text-[11px] font-semibold text-slate-800">{ev.model}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${ev.soc}%`, backgroundColor: socColor }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold" style={{ color: socColor }}>
                          {ev.soc}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-600">{ev.station}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">
                      {ev.range} km
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ev.status === 'Charging'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ev.status === 'Connected'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ev.status === 'Charging' && <Zap className="h-2.5 w-2.5" />}
                        {ev.status === 'Connected' && <Link2 className="h-2.5 w-2.5" />}
                        {ev.status === 'Ready' && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.aside>

      {/* RIGHT PANEL: Active 3D Turntable Vehicle Spec Card */}
      {selected && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.28 }}
          className="pointer-events-auto hidden w-72 flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:flex"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Active 3D Turntable Focus
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-sky-600">{selected.id}</div>
            <div className="text-base font-extrabold text-slate-900">{selected.model}</div>
            <div className="text-xs font-medium text-slate-500">Owner: {selected.owner}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Battery SoC</div>
              <div
                className="font-mono text-lg font-extrabold"
                style={{ color: getSoCCategoryColor(selected.soc) }}
              >
                {selected.soc}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Est. Range</div>
              <div className="font-mono text-lg font-extrabold text-slate-900">
                {selected.range} km
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Charge Rate</div>
              <div className="font-mono text-sm font-bold text-sky-600">{selected.rate}</div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Assigned Hub</div>
              <div className="text-xs font-bold text-slate-800">{selected.station}</div>
            </div>
          </div>
        </motion.aside>
      )}
    </div>
  );
}
