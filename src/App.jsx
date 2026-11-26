import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import SpatialCanvas from './components/three/SpatialCanvas';
import LoadingOverlay from './components/LoadingOverlay';
import NavigationRail from './components/hud/NavigationRail';
import ToastContainer from './components/hud/ToastContainer';
import NeuroTwinDrawer from './components/hud/NeuroTwinDrawer';
import DashboardHUD from './components/hud/panels/DashboardHUD';
import VehiclesHUD from './components/hud/panels/VehiclesHUD';
import StationsHUD from './components/hud/panels/StationsHUD';
import ChargingHUD from './components/hud/panels/ChargingHUD';
import EnergyHUD from './components/hud/panels/EnergyHUD';
import BatteryHUD from './components/hud/panels/BatteryHUD';
import SellChargeHUD from './components/hud/panels/SellChargeHUD';
import {
  CHARGING_STATIONS_OPTIONS,
  INITIAL_EVS,
  PACK_CAPACITY_KWH,
  STATIONS_DATA,
  generateBatteryCells,
} from './data/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [customFocus, setCustomFocus] = useState(null);
  const [toasts, setToasts] = useState([]);

  // 1. Dashboard State
  const [stats, setStats] = useState({
    evs: 8542,
    chargers: 427,
    solar: 73,
    demand: 61,
    batt: 84,
    renew: 68,
  });
  const [simPulseKey, setSimPulseKey] = useState(0);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // 2. Vehicles Fleet State
  const [vehicles, setVehicles] = useState(INITIAL_EVS);
  const [selectedVehicleId, setSelectedVehicleId] = useState(INITIAL_EVS[0].id);
  const evCounterRef = useRef(1006);

  // 3. Stations State
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [selectedStationId, setSelectedStationId] = useState(null);

  // 4. Smart Charging State
  const [chargingState, setChargingState] = useState({
    selectedVehicleId: INITIAL_EVS[0].id,
    stationKw: 80,
    stationShortName: 'Station A – Andheri East',
    startSoC: 32,
    targetSoC: 80,
    currentSoC: 32,
    energyUsed: 0,
    timeLeftMin: 0,
    estCost: '0',
    isCharging: false,
  });
  const chargingTimerRef = useRef(null);
  const bmsDebounceRef = useRef(null);

  // 5. Energy & Solar Grid State
  const [energyMetrics, setEnergyMetrics] = useState({
    solarMw: 142,
    gridMw: 87,
    battReserveKwh: 36,
  });
  const [loadBars, setLoadBars] = useState({
    solarFeed: 73,
    gridDraw: 48,
    battDispatch: 62,
    industrial: 35,
  });
  const [energyRoutes, setEnergyRoutes] = useState([
    { id: 'solar', title: 'Solar → EV Fleet', desc: 'Direct rooftop solar to 342 charging EVs', pct: 58, color: '#F59E0B' },
    { id: 'batt', title: 'Battery → Peak Demand', desc: 'Discharging 24 kWh during morning peak', pct: 24, color: '#10B981' },
    { id: 'grid', title: 'Grid → Battery Reserve', desc: 'Off-peak charging for night-time buffer', pct: 18, color: '#0284C7' },
  ]);
  const [balanceRippleKey, setBalanceRippleKey] = useState(0);

  // 6. Battery Intelligence State
  const [batteryCells, setBatteryCells] = useState(() => generateBatteryCells());
  const [selectedCell, setSelectedCell] = useState(() => generateBatteryCells()[4]);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [explodedBattery, setExplodedBattery] = useState(true);
  const [optimizeAnimKey, setOptimizeAnimKey] = useState(0);

  // 7. Sell Charge (P2P) State
  const [p2pState, setP2pState] = useState({
    sellerIdx: 1, // EV-1002 (55%) by default so 10 kWh fits comfortably
    buyerIdx: 0,  // EV-1001 (32%)
    energyKwh: 10,
    pricePerKwh: 12,
    summary: null,
    errorMsg: '',
    history: [],
    calculating: false,
  });
  const [transferPulseKey, setTransferPulseKey] = useState(0);

  // Toast helper
  const addToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  // Tab switch handler (resets custom camera focus)
  const handleSelectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    setCustomFocus(null);
    if (tabId !== 'stations') setSelectedStationId(null);
  }, []);

  const handleResetCamera = useCallback(() => {
    setCustomFocus(null);
    setSelectedStationId(null);
    addToast('Camera view reset to studio framing');
  }, [addToast]);

  // Subtle live ambient drift on Dashboard
  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() > 0.55) {
        setStats((prev) => ({
          ...prev,
          solar: Math.min(100, Math.max(30, prev.solar + (Math.random() > 0.5 ? 1 : -1))),
          demand: Math.min(100, Math.max(30, prev.demand + (Math.random() > 0.5 ? 1 : -1))),
        }));
      }
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup charging interval on unmount
  useEffect(() => {
    return () => {
      if (chargingTimerRef.current) clearInterval(chargingTimerRef.current);
      if (bmsDebounceRef.current) clearTimeout(bmsDebounceRef.current);
    };
  }, []);

  // ── 1. Dashboard Handlers ──
  const handleSimulateCity = () => {
    const delta = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    setStats((prev) => {
      const next = {
        solar: Math.min(100, Math.max(30, prev.solar + delta(-8, 12))),
        demand: Math.min(100, Math.max(30, prev.demand + delta(-10, 10))),
        batt: Math.min(100, Math.max(40, prev.batt + delta(-5, 8))),
        renew: Math.min(100, Math.max(30, prev.renew + delta(-6, 10))),
        evs: prev.evs + delta(-120, 240),
        chargers: prev.chargers + delta(-18, 36),
      };
      addToast(`City load simulated — Solar ${next.solar}%, Grid Demand ${next.demand}%`);
      return next;
    });
    setSimPulseKey((k) => k + 1);
  };

  const handleAskAiAdvisor = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_input_kw: 120,
          traction_soc: chargingState.currentSoC,
          aux_soc: 82,
          grid_demand_pct: stats.demand,
        }),
      });
      if (!res.ok) throw new Error('Backend advisor unavailable');
      const data = await res.json();
      setAiAdvice(data.recommendation);
      addToast('AI BMS recommendation updated');
    } catch {
      const fallback = `Grid demand is at ${stats.demand}% with ${stats.solar}% solar availability. Maintain 80%/20% Dual-Bank split and route non-critical fleet loads to Station C (Powai Solar).`;
      setAiAdvice(fallback);
      addToast('AI BMS local analysis ready');
    } finally {
      setAiLoading(false);
    }
  };

  // ── 2. Vehicles Handlers ──
  const handleAddVehicle = () => {
    const stations = ['A – Andheri', 'B – BKC', 'C – Powai', 'A – Andheri'];
    const statuses = ['Charging', 'Connected', 'Ready'];
    const models = ['Tata Nexon EV', 'MG ZS EV', 'Hyundai Ioniq 5', 'Kia EV6', 'BYD Atto 3'];
    const rates = ['80 kW', '120 kW', '60 kW'];
    const owners = ['Arjun T.', 'Meera V.', 'Suresh N.', 'Kavya P.', 'Rajan D.'];
    const soc = Math.floor(Math.random() * 70) + 15;
    const id = `EV-${evCounterRef.current++}`;
    const newEv = {
      id,
      model: models[Math.floor(Math.random() * models.length)],
      soc,
      station: stations[Math.floor(Math.random() * stations.length)],
      range: Math.floor(soc * 3.4),
      rate: rates[Math.floor(Math.random() * rates.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      owner: owners[Math.floor(Math.random() * owners.length)],
    };
    setVehicles((prev) => [...prev, newEv]);
    setSelectedVehicleId(id);
    addToast(`${newEv.id} added to fleet · SoC: ${newEv.soc}% · Station ${newEv.station}`);
  };

  // ── 3. Stations Handlers ──
  const handleFindStations = () => {
    setGpsStatus('scanning');
    addToast('GPS scanning — locating nearest stations…', 'warning');
    setTimeout(() => {
      setGpsStatus('found');
      addToast('Found 3 charging stations near you!');
    }, 1600);
  };

  const handleSelectStation = (station) => {
    setSelectedStationId(station.id);
    setCustomFocus({
      position: station.cameraPos,
      target: [station.coords3d[0], 0.55, station.coords3d[2]],
    });
    addToast(`Station selected: ${station.name} · Camera locked on 3D stalls`);
  };

  // ── 4. Smart Charging Handlers ──
  const handleChangeTargetSoc = (val) => {
    setChargingState((prev) => ({ ...prev, targetSoC: val }));
    if (bmsDebounceRef.current) clearTimeout(bmsDebounceRef.current);
    bmsDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/bms/allocate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_input_kw: 120,
            traction_soc: val,
            aux_soc: 82,
            grid_demand_pct: stats.demand,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          addToast(
            `BMS: ${d.allocation.main_traction_bank_kw}kW Traction / ${d.allocation.auxiliary_bank_kw}kW Aux`
          );
        }
      } catch {
        // Offline/static graceful fallback
      }
    }, 280);
  };

  const handleStopCharging = useCallback(
    (completed = false) => {
      if (chargingTimerRef.current) {
        clearInterval(chargingTimerRef.current);
        chargingTimerRef.current = null;
      }
      setChargingState((prev) => {
        if (!prev.isCharging && !completed) return prev;
        if (completed) {
          addToast(`Charging complete! Reached ${prev.targetSoC}% · ₹${prev.estCost} charged`);
        } else {
          addToast(`Session stopped at ${Math.round(prev.currentSoC)}% SoC`, 'warning');
        }
        return { ...prev, isCharging: false };
      });
    },
    [addToast]
  );

  const handleStartCharging = () => {
    if (chargingState.isCharging) return;
    if (chargingState.startSoC >= chargingState.targetSoC) {
      addToast('Battery already at or above target!', 'warning');
      return;
    }

    const power = chargingState.stationKw;
    const capacity = PACK_CAPACITY_KWH;

    setChargingState((prev) => ({
      ...prev,
      isCharging: true,
      currentSoC: prev.startSoC,
      energyUsed: 0,
      estCost: '0',
    }));
    addToast(`Charging started at ${chargingState.stationShortName} · ${power} kW`);

    chargingTimerRef.current = setInterval(() => {
      setChargingState((prev) => {
        if (!prev.isCharging) return prev;
        const socPerTick = (power / capacity) * 1.35;
        const nextSoC = Math.min(prev.targetSoC, +(prev.currentSoC + socPerTick).toFixed(1));
        const deltaSoC = Math.max(0, nextSoC - prev.currentSoC);
        const nextEnergy = prev.energyUsed + (deltaSoC / 100) * capacity;
        const remaining = prev.targetSoC - nextSoC;
        const timeLeftMin = Math.max(0, Math.ceil(((remaining / 100) * capacity / power) * 60));
        const estCost = (nextEnergy * 9.5).toFixed(0);

        if (nextSoC >= prev.targetSoC) {
          setTimeout(() => handleStopCharging(true), 20);
        }

        return {
          ...prev,
          currentSoC: nextSoC,
          energyUsed: nextEnergy,
          timeLeftMin,
          estCost,
        };
      });
    }, 550);
  };

  // ── 5. Energy Grid Handlers ──
  const handleBalanceGrid = () => {
    const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const s = r(48, 66);
    const b = r(18, 30);
    const g = Math.max(10, 100 - s - b);

    setLoadBars({
      solarFeed: r(60, 88),
      gridDraw: r(35, 65),
      battDispatch: r(50, 82),
      industrial: r(28, 52),
    });
    setEnergyMetrics({
      solarMw: r(115, 168),
      gridMw: r(65, 105),
      battReserveKwh: r(24, 48),
    });
    setEnergyRoutes((prev) => [
      { ...prev[0], pct: s },
      { ...prev[1], pct: b },
      { ...prev[2], pct: g },
    ]);
    setBalanceRippleKey((k) => k + 1);
    addToast('Grid balanced — optimal load distribution achieved');
  };

  // ── 6. Battery Intelligence Handlers ──
  const handleOptimizeBanks = () => {
    setOptimizeAnimKey((k) => k + 1);
    setBatteryCells((prev) =>
      prev.map((c) => ({
        ...c,
        soh: Math.min(99, c.soh < 60 ? c.soh + 4 : Math.max(55, c.soh + (Math.random() > 0.4 ? 1 : 0))),
        temp: +(24 + Math.random() * 4).toFixed(1),
      }))
    );
    addToast('AI bank optimization complete — 32 cells recalibrated');
  };

  // ── 7. Sell Charge (P2P) Handlers ──
  const handleCalculateP2P = async () => {
    const { sellerIdx, buyerIdx, energyKwh, pricePerKwh } = p2pState;
    const kWh = parseFloat(energyKwh);
    const price = parseFloat(pricePerKwh);

    if (sellerIdx === buyerIdx) {
      const msg = 'Seller and Buyer must be different vehicles.';
      setP2pState((p) => ({ ...p, errorMsg: msg, summary: null }));
      addToast(msg, 'error');
      return;
    }
    if (!kWh || kWh <= 0) {
      const msg = 'Enter a valid energy amount (kWh).';
      setP2pState((p) => ({ ...p, errorMsg: msg, summary: null }));
      addToast(msg, 'error');
      return;
    }
    if (!price || price <= 0) {
      const msg = 'Enter a valid price per kWh.';
      setP2pState((p) => ({ ...p, errorMsg: msg, summary: null }));
      addToast(msg, 'error');
      return;
    }

    const seller = vehicles[sellerIdx];
    const buyer = vehicles[buyerIdx];
    const sellerAvailableKwh = (seller.soc / 100) * PACK_CAPACITY_KWH;

    if (kWh > sellerAvailableKwh - 5) {
      const maxT = Math.max(0, sellerAvailableKwh - 5).toFixed(1);
      const msg = `${seller.id} only has ${sellerAvailableKwh.toFixed(1)} kWh available. Max transferable (5 kWh reserve): ${maxT} kWh.`;
      setP2pState((p) => ({ ...p, errorMsg: msg, summary: null }));
      addToast(msg, 'error');
      return;
    }

    setP2pState((p) => ({ ...p, calculating: true, errorMsg: '' }));

    let serverData = null;
    try {
      const res = await fetch('/api/p2p/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: seller.id,
          buyer_id: buyer.id,
          seller_soc: seller.soc,
          buyer_soc: buyer.soc,
          energy_kwh: kWh,
          price_per_kwh: price,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setP2pState((p) => ({
          ...p,
          calculating: false,
          errorMsg: json.detail || 'Server validation failed.',
          summary: null,
        }));
        addToast(json.detail || 'Validation failed', 'error');
        return;
      }
      serverData = json;
    } catch {
      const base = +(kWh * price).toFixed(2);
      const fee = +(base * 0.05).toFixed(2);
      serverData = {
        seller_id: seller.id,
        buyer_id: buyer.id,
        energy_kwh: +kWh.toFixed(2),
        price_per_kwh: +price.toFixed(2),
        base_amount: base,
        service_fee: fee,
        buyer_total: +(base + fee).toFixed(2),
        seller_receives: +(base - fee).toFixed(2),
        seller_soc_after: +(((sellerAvailableKwh - kWh) / PACK_CAPACITY_KWH) * 100).toFixed(1),
        buyer_soc_after: +Math.min(
          100,
          (((buyer.soc / 100) * PACK_CAPACITY_KWH + kWh) / PACK_CAPACITY_KWH) * 100
        ).toFixed(1),
        status: 'confirmed',
      };
    }

    setP2pState((p) => ({
      ...p,
      calculating: false,
      errorMsg: '',
      summary: { ...serverData, sellerIdx, buyerIdx },
    }));
    addToast(`Transfer calculated: ${kWh} kWh from ${seller.id} → ${buyer.id}`);
  };

  const handleConfirmP2PTransfer = () => {
    const { summary } = p2pState;
    if (!summary) return;

    setVehicles((prev) =>
      prev.map((ev, idx) => {
        if (idx === summary.sellerIdx) {
          return {
            ...ev,
            soc: summary.seller_soc_after,
            range: Math.round(summary.seller_soc_after * 3.4),
          };
        }
        if (idx === summary.buyerIdx) {
          return {
            ...ev,
            soc: summary.buyer_soc_after,
            range: Math.round(summary.buyer_soc_after * 3.4),
          };
        }
        return ev;
      })
    );

    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setP2pState((prev) => ({
      ...prev,
      summary: null,
      history: [
        {
          id: `${Date.now()}`,
          sellerId: summary.seller_id,
          buyerId: summary.buyer_id,
          kwh: summary.energy_kwh,
          price: summary.price_per_kwh,
          total: summary.buyer_total,
          time,
        },
        ...prev.history,
      ],
    }));

    setTransferPulseKey((k) => k + 1);
    addToast(
      `Transfer confirmed! ${summary.energy_kwh.toFixed(2)} kWh sent · Buyer paid ₹${summary.buyer_total.toFixed(2)}`
    );
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const sellerVehicle = vehicles[p2pState.sellerIdx] || vehicles[0];
  const buyerVehicle = vehicles[p2pState.buyerIdx] || vehicles[1] || vehicles[0];

  const neuroTelemetry = useMemo(
    () => ({
      active_tab: activeTab,
      kpis: stats,
      energy_grid: {
        solar_mw: energyMetrics.solarMw,
        grid_mw: energyMetrics.gridMw,
        battery_reserve_kwh: energyMetrics.battReserveKwh,
        load_bars: loadBars,
        routing_splits: energyRoutes.map((r) => ({ channel: r.title, pct: r.pct })),
      },
      stations: STATIONS_DATA.map((s) => ({
        id: s.id,
        name: s.name,
        distance_km: s.distanceKm,
        free_chargers: s.freeChargers,
        queue_evs: s.queue,
        max_power_kw: s.maxPowerKw,
        avg_wait_min: s.avgWaitMin,
        score_pct: s.score,
      })),
      fleet: vehicles.map((v) => ({
        id: v.id,
        model: v.model,
        soc_pct: v.soc,
        station: v.station,
        range_km: v.range,
        rate: v.rate,
        status: v.status,
      })),
      charging_session: {
        vehicle_id: chargingState.selectedVehicleId,
        station_kw: chargingState.stationKw,
        current_soc_pct: chargingState.currentSoC,
        target_soc_pct: chargingState.targetSoC,
        energy_used_kwh: +chargingState.energyUsed.toFixed(2),
        est_cost_inr: chargingState.estCost,
        is_charging: chargingState.isCharging,
      },
      dual_bank_battery: {
        bank_alpha: { allocation_pct: 80, soh_pct: 94, cycles: 1247, temp_c: 28 },
        bank_beta: { allocation_pct: 20, soh_pct: 98, cycles: 382, temp_c: 24 },
        flagged_cells_under_60: batteryCells
          .filter((c) => c.soh < 60)
          .map((c) => ({ id: c.id, soh: c.soh, temp: c.temp, voltage: c.voltage })),
      },
      p2p_rules: {
        pack_capacity_kwh: PACK_CAPACITY_KWH,
        platform_fee_pct: 5,
        min_seller_reserve_kwh: 5,
        current_seller: sellerVehicle?.id,
        current_buyer: buyerVehicle?.id,
        energy_kwh: p2pState.energyKwh,
        price_per_kwh_inr: p2pState.pricePerKwh,
      },
    }),
    [
      activeTab,
      stats,
      energyMetrics,
      loadBars,
      energyRoutes,
      vehicles,
      chargingState,
      batteryCells,
      sellerVehicle?.id,
      buyerVehicle?.id,
      p2pState.energyKwh,
      p2pState.pricePerKwh,
    ]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-900">
      <LoadingOverlay canvasReady={canvasReady} />

      {/* Full-Viewport Interactive 3D WebGL Studio */}
      <SpatialCanvas
        activeTab={activeTab}
        customFocus={customFocus}
        onCanvasCreated={() => setCanvasReady(true)}
        stats={stats}
        simPulseKey={simPulseKey}
        selectedVehicle={selectedVehicle}
        selectedStationId={selectedStationId}
        onSelectStation={handleSelectStation}
        chargingState={chargingState}
        energyMetrics={energyMetrics}
        energyRoutes={energyRoutes}
        balanceRippleKey={balanceRippleKey}
        batteryCells={batteryCells}
        selectedCell={selectedCell}
        hoveredCell={hoveredCell}
        onHoverCell={setHoveredCell}
        onSelectCell={setSelectedCell}
        explodedBattery={explodedBattery}
        optimizeAnimKey={optimizeAnimKey}
        p2pSceneProps={{
          seller: sellerVehicle,
          buyer: buyerVehicle,
          energyKwh: p2pState.energyKwh,
          isCalculated: Boolean(p2pState.summary),
          transferPulseKey,
        }}
      />

      {/* Top/Bottom Floating Daylight Glass Navigation */}
      <NavigationRail
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        hudCollapsed={hudCollapsed}
        onToggleHud={() => setHudCollapsed((c) => !c)}
        onResetCamera={handleResetCamera}
      />

      <ToastContainer toasts={toasts} />

      {/* Subtle Orbit/Zoom Studio Hint at Bottom Center */}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[10px] font-semibold text-slate-500 shadow-sm backdrop-blur-md lg:bottom-4 lg:block">
        Drag to Orbit · Scroll to Zoom · Right-Drag to Pan
      </div>

      {/* Floating Frosted Glass HUD Modules */}
      <AnimatePresence mode="wait">
        {!hudCollapsed && activeTab === 'dashboard' && (
          <DashboardHUD
            key="hud-dashboard"
            stats={stats}
            onSimulateCity={handleSimulateCity}
            onApplyRecommendation={(msg) => addToast(msg)}
            onAskAiAdvisor={handleAskAiAdvisor}
            aiAdvice={aiAdvice}
            aiLoading={aiLoading}
          />
        )}

        {!hudCollapsed && activeTab === 'vehicles' && (
          <VehiclesHUD
            key="hud-vehicles"
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            onAddVehicle={handleAddVehicle}
          />
        )}

        {!hudCollapsed && activeTab === 'stations' && (
          <StationsHUD
            key="hud-stations"
            gpsStatus={gpsStatus}
            selectedStationId={selectedStationId}
            onFindStations={handleFindStations}
            onSelectStation={handleSelectStation}
            onResetOverview={handleResetCamera}
          />
        )}

        {!hudCollapsed && activeTab === 'charging' && (
          <ChargingHUD
            key="hud-charging"
            vehicles={vehicles}
            chargingState={chargingState}
            onChangeVehicle={(id) => {
              const ev = vehicles.find((v) => v.id === id);
              setChargingState((prev) => ({
                ...prev,
                selectedVehicleId: id,
                startSoC: ev ? ev.soc : prev.startSoC,
                currentSoC: ev ? ev.soc : prev.currentSoC,
              }));
            }}
            onChangeStationKw={(kw) => {
              const opt = CHARGING_STATIONS_OPTIONS.find((o) => o.kw === kw);
              setChargingState((prev) => ({
                ...prev,
                stationKw: kw,
                stationShortName: opt ? opt.shortLabel : prev.stationShortName,
              }));
            }}
            onChangeStartSoc={(soc) =>
              setChargingState((prev) => ({ ...prev, startSoC: soc, currentSoC: soc }))
            }
            onChangeTargetSoc={handleChangeTargetSoc}
            onStartCharging={handleStartCharging}
            onStopCharging={handleStopCharging}
          />
        )}

        {!hudCollapsed && activeTab === 'energy' && (
          <EnergyHUD
            key="hud-energy"
            energyMetrics={energyMetrics}
            loadBars={loadBars}
            routes={energyRoutes}
            onBalanceGrid={handleBalanceGrid}
          />
        )}

        {!hudCollapsed && activeTab === 'battery' && (
          <BatteryHUD
            key="hud-battery"
            cells={batteryCells}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            exploded={explodedBattery}
            onToggleExploded={() => setExplodedBattery((e) => !e)}
            onOptimizeBanks={handleOptimizeBanks}
          />
        )}

        {!hudCollapsed && activeTab === 'sell-charge' && (
          <SellChargeHUD
            key="hud-sell-charge"
            vehicles={vehicles}
            p2pState={p2pState}
            onChangeField={(field, val) =>
              setP2pState((prev) => ({ ...prev, [field]: val }))
            }
            onCalculate={handleCalculateP2P}
            onConfirm={handleConfirmP2PTransfer}
          />
        )}
      </AnimatePresence>

      {/* Neuro Twin Obsidian Glass AI Drawer & Trigger Pill */}
      <NeuroTwinDrawer
        activeTab={activeTab}
        telemetry={neuroTelemetry}
        onInspectTab={handleSelectTab}
        onShowToast={addToast}
      />
    </div>
  );
}
