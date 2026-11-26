import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, ExternalLink, Maximize2 } from 'lucide-react';
import { STATIONS_DATA } from '../../../data/initialData';

export default function StationsHUD({
  gpsStatus,
  selectedStationId,
  onFindStations,
  onSelectStation,
  onResetOverview,
}) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 top-20 z-10 flex flex-col justify-between gap-3 lg:bottom-4 lg:flex-row lg:items-start">
      {/* LEFT PANEL: GPS & Station Cards */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[46vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-96"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Charging Stations Hub</h2>
            <p className="text-[11px] font-medium text-slate-500">
              Select a hub to fly camera to 3D stalls
            </p>
          </div>
          {selectedStationId && (
            <button
              onClick={onResetOverview}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Maximize2 className="h-3 w-3" />
              Overview
            </button>
          )}
        </div>

        {/* GPS Location Banner */}
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/75 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-900">GPS Location Acquired</div>
              <div className="mt-0.5 text-[11px] text-slate-600">
                Mumbai, MH — 19.0760° N, 72.8777° E
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
                <span
                  className={`h-2 w-2 rounded-full ${
                    gpsStatus === 'found'
                      ? 'bg-emerald-500'
                      : gpsStatus === 'scanning'
                      ? 'animate-ping bg-amber-500'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-slate-700">
                  {gpsStatus === 'found'
                    ? '3 stations found nearby'
                    : gpsStatus === 'scanning'
                    ? 'Scanning… 0.8 km radius'
                    : 'Ready to locate nearest stations'}
                </span>
              </div>
            </div>
            <button
              onClick={onFindStations}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              <MapPin className="h-3 w-3" />
              Find Nearest
            </button>
          </div>
        </div>

        {/* 3 Station Cards */}
        <div className="flex flex-col gap-2.5">
          {STATIONS_DATA.map((st) => {
            const isSelected = selectedStationId === st.id;
            return (
              <div
                key={st.id}
                className={`rounded-xl border p-3 shadow-sm transition-all ${
                  isSelected
                    ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/20'
                    : 'border-slate-200/90 bg-white/85'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{st.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {st.distanceKm} km away · {st.type}
                    </div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 font-mono text-[11px] font-extrabold text-emerald-700">
                    {st.score}%
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
                  <div className="rounded-lg bg-slate-50 p-1.5">
                    <div className="text-[9px] font-semibold uppercase text-slate-400">Free</div>
                    <div className="font-mono text-xs font-extrabold text-emerald-600">
                      {st.freeChargers}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-1.5">
                    <div className="text-[9px] font-semibold uppercase text-slate-400">Queue</div>
                    <div className="font-mono text-xs font-extrabold text-slate-800">
                      {st.queue} EVs
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-1.5">
                    <div className="text-[9px] font-semibold uppercase text-slate-400">Power</div>
                    <div className="font-mono text-xs font-extrabold text-sky-600">
                      {st.maxPowerKw}kW
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-1.5">
                    <div className="text-[9px] font-semibold uppercase text-slate-400">Wait</div>
                    <div className="font-mono text-xs font-extrabold text-slate-800">
                      {st.avgWaitMin}m
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      st.badgeTone === 'emerald'
                        ? 'bg-emerald-50 text-emerald-700'
                        : st.badgeTone === 'blue'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {st.badge}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectStation(st)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-slate-800"
                    >
                      <Navigation className="h-3 w-3 text-emerald-400" />
                      Select Station
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/${encodeURIComponent(st.mapsQuery)}`,
                          '_blank',
                          'noopener'
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Maps
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.aside>
    </div>
  );
}
