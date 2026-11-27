import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Zap, Link2, CheckCircle2, X, Car, Trash2 } from 'lucide-react';
import { getSoCCategoryColor } from '../../../data/initialData';

const STATION_OPTIONS = [
  { label: 'A – Andheri', defaultKw: 80 },
  { label: 'B – BKC', defaultKw: 120 },
  { label: 'C – Powai', defaultKw: 60 },
];

const QUICK_PRESETS = [
  { model: 'Mahindra XEV 9e', maxRange: 530, kw: 140 },
  { model: 'Tesla Model 3', maxRange: 513, kw: 170 },
  { model: 'Tata Curvv EV', maxRange: 430, kw: 70 },
  { model: 'Porsche Taycan', maxRange: 503, kw: 240 },
];

export default function VehiclesHUD({
  vehicles,
  selectedVehicleId,
  nextVehicleId,
  onSelectVehicle,
  onAddVehicle,
  onDeleteVehicle,
}) {
  const selected = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const [modalOpen, setModalOpen] = useState(false);

  const [model, setModel] = useState('');
  const [owner, setOwner] = useState('');
  const [vehicleId, setVehicleId] = useState(nextVehicleId || 'EV-1006');
  const [maxRange, setMaxRange] = useState('400');
  const [soc, setSoc] = useState(65);
  const [station, setStation] = useState('A – Andheri');
  const [status, setStatus] = useState('Charging');
  const [chargeRateKw, setChargeRateKw] = useState('80');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (modalOpen) {
      setVehicleId(nextVehicleId || 'EV-1006');
      setFormError('');
    }
  }, [modalOpen, nextVehicleId]);

  const numericMaxRange = Math.max(50, Number(maxRange) || 400);
  const estimatedRange = Math.round((soc / 100) * numericMaxRange);

  const handleStationChange = (nextStation) => {
    setStation(nextStation);
    const found = STATION_OPTIONS.find((s) => s.label === nextStation);
    if (found) setChargeRateKw(String(found.defaultKw));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedModel = model.trim();
    if (!trimmedModel) {
      setFormError('Please enter a vehicle make & model.');
      return;
    }

    onAddVehicle({
      id: vehicleId.trim() || nextVehicleId,
      model: trimmedModel,
      owner: owner.trim() || 'Sudarshan',
      soc,
      station,
      status,
      chargeRate: Number(chargeRateKw) || 80,
      range: estimatedRange,
    });

    setModalOpen(false);
    setModel('');
    setOwner('');
    setMaxRange('400');
    setSoc(65);
    setStation('A – Andheri');
    setStatus('Charging');
    setChargeRateKw('80');
    setFormError('');
  };

  return (
    <>
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
              type="button"
              onClick={() => setModalOpen(true)}
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
                  <th className="w-8 px-2 py-2.5" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((ev) => {
                  const isSelected = ev.id === selected?.id;
                  const socColor = getSoCCategoryColor(ev.soc);
                  const canDelete = vehicles.length > 1;
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => onSelectVehicle(ev.id)}
                      className={`group cursor-pointer transition-colors ${
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
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={!canDelete}
                          title={
                            canDelete
                              ? `Remove ${ev.model} (${ev.id})`
                              : 'At least 1 vehicle must remain'
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canDelete && onDeleteVehicle) onDeleteVehicle(ev.id);
                          }}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-25 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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

            <button
              type="button"
              disabled={vehicles.length <= 1}
              onClick={() => onDeleteVehicle && onDeleteVehicle(selected.id)}
              title={
                vehicles.length <= 1
                  ? 'Cannot remove the last remaining vehicle'
                  : `Remove ${selected.model} (${selected.id})`
              }
              className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200/90 bg-red-50/70 px-3 py-2 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100/80 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Vehicle
            </button>
          </motion.aside>
        )}
      </div>

      {/* MANUAL "+ ADD EV VEHICLE" DAYLIGHT FROSTED GLASS MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="hud-scroll max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Car className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Register EV Vehicle</h3>
                    <p className="text-[11px] text-slate-500">
                      Add any EV to the fleet &amp; preview on the 3D studio turntable
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
                {/* Vehicle Make & Model */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Vehicle Make &amp; Model
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="e.g., Mahindra XEV 9e, Tesla Model 3, Tata Curvv EV..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  />
                  {/* Quick-fill preset chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.model}
                        type="button"
                        onClick={() => {
                          setModel(preset.model);
                          setMaxRange(String(preset.maxRange));
                          setChargeRateKw(String(preset.kw));
                          if (formError) setFormError('');
                        }}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {preset.model}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Owner Name + Vehicle ID */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="e.g., Sudarshan"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Vehicle ID
                    </label>
                    <input
                      type="text"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      placeholder="EV-1006"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-sky-700 placeholder-slate-400 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Max Range + Initial SoC Slider */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Full-Charge Max Range (km)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={1200}
                      value={maxRange}
                      onChange={(e) => setMaxRange(e.target.value)}
                      placeholder="420"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Initial Battery SoC</span>
                      <span
                        className="font-mono text-xs font-extrabold"
                        style={{ color: getSoCCategoryColor(soc) }}
                      >
                        {soc}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={soc}
                      onChange={(e) => setSoc(Number(e.target.value))}
                      className="studio-slider mt-2"
                      style={{
                        background: `linear-gradient(90deg, #10B981 ${((soc - 5) / 95) * 100}%, #E2E8F0 ${((soc - 5) / 95) * 100}%)`,
                      }}
                    />
                    <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-500">
                      <span>Est. Range:</span>
                      <span className="font-mono font-bold text-slate-900">{estimatedRange} km</span>
                    </div>
                  </div>
                </div>

                {/* Station + Status + Charge Rate */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Assigned Station
                    </label>
                    <select
                      value={station}
                      onChange={(e) => handleStationChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                    >
                      {STATION_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.label}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                    >
                      <option value="Charging">Charging</option>
                      <option value="Connected">Connected</option>
                      <option value="Ready">Ready</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Charge Rate (kW)
                    </label>
                    <input
                      type="number"
                      min={11}
                      max={350}
                      value={chargeRateKw}
                      onChange={(e) => setChargeRateKw(e.target.value)}
                      placeholder="80"
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs font-bold text-sky-700 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                    {formError}
                  </div>
                )}

                <div className="mt-1 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Vehicle to Fleet
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
