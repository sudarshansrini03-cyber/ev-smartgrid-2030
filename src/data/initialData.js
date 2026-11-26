export const PACK_CAPACITY_KWH = 72;

export const INITIAL_EVS = [
  {
    id: 'EV-1001',
    model: 'Tata Nexon EV',
    soc: 32,
    station: 'A – Andheri',
    range: 98,
    rate: '80 kW',
    status: 'Charging',
    owner: 'Rahul M.',
  },
  {
    id: 'EV-1002',
    model: 'MG ZS EV',
    soc: 55,
    station: 'B – BKC',
    range: 184,
    rate: '120 kW',
    status: 'Connected',
    owner: 'Priya S.',
  },
  {
    id: 'EV-1003',
    model: 'Hyundai Ioniq 5',
    soc: 18,
    station: 'A – Andheri',
    range: 51,
    rate: '80 kW',
    status: 'Charging',
    owner: 'Amit K.',
  },
  {
    id: 'EV-1004',
    model: 'Kia EV6',
    soc: 71,
    station: 'C – Powai',
    range: 239,
    rate: '60 kW',
    status: 'Ready',
    owner: 'Sneha R.',
  },
  {
    id: 'EV-1005',
    model: 'BYD Atto 3',
    soc: 44,
    station: 'B – BKC',
    range: 146,
    rate: '120 kW',
    status: 'Charging',
    owner: 'Vikram J.',
  },
];

export const STATIONS_DATA = [
  {
    id: 'A',
    name: 'Station A – Andheri East',
    shortName: 'Andheri East',
    distanceKm: 1.2,
    type: 'Fast Charging Hub',
    freeChargers: 14,
    queue: 3,
    maxPowerKw: 150,
    avgWaitMin: 8,
    score: 92,
    badge: 'AI Recommended',
    badgeTone: 'emerald',
    mapsQuery: 'Andheri East EV Station Mumbai',
    coords3d: [-5.2, 0, -2.6],
    cameraPos: [-2.2, 3.6, 1.8],
    hasSolarRoof: false,
  },
  {
    id: 'B',
    name: 'Station B – Bandra BKC',
    shortName: 'Bandra BKC',
    distanceKm: 2.7,
    type: 'Ultra-Fast Hub',
    freeChargers: 9,
    queue: 7,
    maxPowerKw: 240,
    avgWaitMin: 14,
    score: 87,
    badge: 'Ultra Fast',
    badgeTone: 'blue',
    mapsQuery: 'Bandra BKC EV Station Mumbai',
    coords3d: [-0.8, 0, 3.4],
    cameraPos: [2.4, 3.8, 7.6],
    hasSolarRoof: false,
  },
  {
    id: 'C',
    name: 'Station C – Powai Solar',
    shortName: 'Powai Solar',
    distanceKm: 4.1,
    type: 'Solar Powered',
    freeChargers: 21,
    queue: 1,
    maxPowerKw: 80,
    avgWaitMin: 3,
    score: 78,
    badge: '100% Solar',
    badgeTone: 'amber',
    mapsQuery: 'Powai Solar EV Station Mumbai',
    coords3d: [5.4, 0, -1.8],
    cameraPos: [8.4, 3.8, 2.4],
    hasSolarRoof: true,
  },
];

export const AI_RECOMMENDATIONS = [
  {
    id: 'rec-shift',
    title: 'Shift 42 EVs to Station B',
    desc: 'Station A is at 94% capacity. Redistribute to relieve bottleneck.',
    gain: 'Save 18 kWh · Reduce peak by 12%',
    toastMsg: 'Shifted 42 EVs to Station B – load balanced',
  },
  {
    id: 'rec-delay',
    title: 'Delay 28 Non-Critical Charges',
    desc: 'Shift to off-peak 02:00–05:00 window for ₹2,100 savings.',
    gain: 'Save ₹2,100 · Reduce CO₂ by 4.2 kg',
    toastMsg: 'Delayed 28 non-critical charges – grid stabilised',
  },
  {
    id: 'rec-solar',
    title: 'Use Available Solar Storage',
    desc: '36 kWh stored. Deploy now to avoid grid surcharge.',
    gain: 'Save ₹890 · 100% renewable for 14 min',
    toastMsg: 'Solar storage deployed – 36 kWh discharged',
  },
];

export const CHARGING_STATIONS_OPTIONS = [
  { label: 'Station A – Andheri East (80 kW DC Fast)', shortLabel: 'Station A – Andheri East', kw: 80 },
  { label: 'Station B – Bandra BKC (120 kW Ultra Fast)', shortLabel: 'Station B – Bandra BKC', kw: 120 },
  { label: 'Station C – Powai Solar (60 kW AC Solar)', shortLabel: 'Station C – Powai Solar', kw: 60 },
];

export const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Grid' },
  { id: 'vehicles', label: 'EV Vehicles', shortLabel: 'Fleet' },
  { id: 'stations', label: 'Charging Stations', shortLabel: 'Stations' },
  { id: 'charging', label: 'Smart Charging', shortLabel: 'Charge' },
  { id: 'energy', label: 'Energy & Solar', shortLabel: 'Energy' },
  { id: 'battery', label: 'Battery Intel', shortLabel: 'Battery' },
  { id: 'sell-charge', label: 'Sell Charge', shortLabel: 'P2P' },
];

export function generateBatteryCells() {
  // Deterministic 3 flagged critical cells (<60%) + realistic warning & healthy cells
  const flaggedIndices = new Set([5, 18, 27]);
  const warnIndices = new Set([2, 9, 13, 21, 24, 30]);

  return Array.from({ length: 32 }, (_, idx) => {
    const id = idx + 1;
    let soh;
    if (flaggedIndices.has(id)) {
      soh = 52 + ((id * 3) % 7); // 52-58% (<60% critical)
    } else if (warnIndices.has(id)) {
      soh = 68 + ((id * 5) % 15); // 68-82% (warning)
    } else {
      soh = 87 + ((id * 7) % 13); // 87-99% (good)
    }
    const temp = +(24 + (100 - soh) * 0.16).toFixed(1);
    const voltage = +(3.45 + (soh / 100) * 0.72).toFixed(2);
    const cycles = Math.round(900 + (100 - soh) * 18 + (id % 5) * 24);
    return { id, soh, temp, voltage, cycles };
  });
}

export function getSoCCategoryColor(soc) {
  if (soc >= 50) return '#10B981'; // Vivid Emerald
  if (soc >= 25) return '#F59E0B'; // Warm Amber Gold
  return '#EF4444'; // Coral Red
}

export function getCellHealthColor(soh) {
  if (soh > 85) return '#10B981';
  if (soh >= 60) return '#F59E0B';
  return '#EF4444';
}
