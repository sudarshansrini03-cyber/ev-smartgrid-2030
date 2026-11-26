import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, CheckCircle2, ArrowRight, History } from 'lucide-react';
import { PACK_CAPACITY_KWH } from '../../../data/initialData';

export default function SellChargeHUD({
  vehicles,
  p2pState,
  onChangeField,
  onCalculate,
  onConfirm,
}) {
  const {
    sellerIdx,
    buyerIdx,
    energyKwh,
    pricePerKwh,
    summary,
    errorMsg,
    history,
    calculating,
  } = p2pState;

  const seller = vehicles[sellerIdx] || vehicles[0];
  const sellerAvailableKwh = seller ? (seller.soc / 100) * PACK_CAPACITY_KWH : 0;
  const sellerAfterSoC = Math.max(
    0,
    ((sellerAvailableKwh - (Number(energyKwh) || 0)) / PACK_CAPACITY_KWH) * 100
  );

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 top-20 z-10 flex flex-col justify-between gap-3 lg:bottom-4 lg:flex-row lg:items-start">
      {/* LEFT PANEL: Charge Transfer Config */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[44vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-[296px]"
      >
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Sell Charge – P2P Transfer</h2>
          <p className="text-[11px] font-medium text-slate-500">
            Peer-to-peer energy bridge with 5% platform fee
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Seller Vehicle
            </label>
            <select
              value={sellerIdx}
              onChange={(e) => onChangeField('sellerIdx', Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-sky-500"
            >
              {vehicles.map((ev, i) => (
                <option key={ev.id} value={i}>
                  {ev.id} · SoC {ev.soc}% ({Math.round((ev.soc / 100) * PACK_CAPACITY_KWH * 10) / 10} kWh)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Buyer Vehicle
            </label>
            <select
              value={buyerIdx}
              onChange={(e) => onChangeField('buyerIdx', Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
            >
              {vehicles.map((ev, i) => (
                <option key={ev.id} value={i}>
                  {ev.id} · SoC {ev.soc}% ({Math.round((ev.soc / 100) * PACK_CAPACITY_KWH * 10) / 10} kWh)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Energy (kWh)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={energyKwh}
                onChange={(e) => onChangeField('energyKwh', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Price / kWh (₹)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                step={0.5}
                value={pricePerKwh}
                onChange={(e) => onChangeField('pricePerKwh', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Seller SoC After Preview */}
        {Number(energyKwh) > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-white/85 p-2.5">
            <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-slate-500">
              <span>Seller SoC After Transfer</span>
              <span className="font-mono text-slate-900">{sellerAfterSoC.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  sellerAfterSoC >= 50
                    ? 'bg-emerald-500'
                    : sellerAfterSoC >= 20
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${sellerAfterSoC}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onCalculate}
          disabled={calculating}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
        >
          <Calculator className="h-3.5 w-3.5" />
          {calculating ? 'Calculating…' : 'Calculate Charge Sale'}
        </button>
      </motion.aside>

      {/* RIGHT PANEL: Transaction Summary & History */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.28 }}
        className="hud-scroll pointer-events-auto flex max-h-[38vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-xl lg:max-h-[calc(100vh-6.5rem)] lg:w-[296px]"
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Transaction Summary
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs font-semibold text-red-600">
            {errorMsg}
          </div>
        )}

        {summary ? (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white/90 p-3.5 shadow-sm">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Energy Transferred</span>
              <span className="font-mono font-bold text-sky-600">
                {summary.energy_kwh.toFixed(2)} kWh
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Price per kWh</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{summary.price_per_kwh.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Base Amount</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{summary.base_amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Service Fee (5%)</span>
              <span className="font-mono font-bold text-red-500">
                ₹{summary.service_fee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Seller Receives</span>
              <span className="font-mono font-bold text-emerald-600">
                ₹{summary.seller_receives.toFixed(2)}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/75 p-2.5">
              <div>
                <div className="text-[11px] font-bold text-slate-700">Buyer Pays Total</div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>{summary.seller_id}</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span>{summary.buyer_id}</span>
                </div>
              </div>
              <div className="font-mono text-xl font-black text-emerald-600">
                ₹{summary.buyer_total.toFixed(2)}
              </div>
            </div>

            <button
              onClick={onConfirm}
              className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Transfer
            </button>
          </div>
        ) : (
          !errorMsg && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-5 text-center text-xs text-slate-500">
              Configure Seller, Buyer &amp; kWh, then click{' '}
              <strong className="text-slate-800">Calculate Charge Sale</strong>.
            </div>
          )
        )}

        {/* Recent P2P History */}
        <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <History className="h-3 w-3" />
            P2P Transaction History
          </div>
          {history.length === 0 ? (
            <div className="text-[11px] text-slate-400">
              No transfers confirmed yet.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {history.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-[11px]"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {tx.sellerId} → {tx.buyerId}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tx.kwh.toFixed(1)} kWh · ₹{tx.price.toFixed(2)}/kWh · {tx.time}
                    </div>
                  </div>
                  <div className="font-mono font-extrabold text-emerald-600">
                    ₹{tx.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
