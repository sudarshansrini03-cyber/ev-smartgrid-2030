export const PACK_CAPACITY_KWH = 72;

export const INITIAL_EVS = [
  {
    id: 'Vehicle 1',
    model: 'Porsche Taycan Turbo S',
    owner: 'Sudarshan',
    soc: 78,
    station: 'C - Kochi KL',
    range: 410,
    chargeRate: 250,
    rate: '250 kW',
    status: 'Charging',
  },
  {
    id: 'Vehicle 2',
    model: 'Maserati GranTurismo Folgore',
    owner: 'Tanay',
    soc: 64,
    station: 'B - Bengaluru KA',
    range: 360,
    chargeRate: 220,
    rate: '220 kW',
    status: 'Charging',
  },
];

export const STATIONS_DATA = [
  {
    id: 'A',
    name: 'Station A — Chennai OMR Corridor, Tamil Nadu',
    shortName: 'Chennai TN',
    hubCode: 'A - Chennai TN',
    coordsLabel: '12.9165° N, 80.2275° E',
    distanceKm: 1.4,
    type: 'Fast Charging Hub',
    freeChargers: 14,
    queue: 3,
    maxPowerKw: 150,
    avgWaitMin: 6,
    score: 94,
    badge: 'AI Recommended',
    badgeTone: 'emerald',
    mapsQuery: '12.9165,80.2275',
    coords3d: [-5.2, 0, -2.6],
    cameraPos: [-2.2, 3.6, 1.8],
    hasSolarRoof: false,
  },
  {
    id: 'B',
    name: 'Station B — Bengaluru Electronic City, Karnataka',
    shortName: 'Bengaluru KA',
    hubCode: 'B - Bengaluru KA',
    coordsLabel: '12.8399° N, 77.6770° E',
    distanceKm: 2.9,
    type: 'Ultra-Fast Hub',
    freeChargers: 9,
    queue: 5,
    maxPowerKw: 240,
    avgWaitMin: 11,
    score: 89,
    badge: 'Ultra Fast',
    badgeTone: 'blue',
    mapsQuery: '12.8399,77.6770',
    coords3d: [-0.8, 0, 3.4],
    cameraPos: [2.4, 3.8, 7.6],
    hasSolarRoof: false,
  },
  {
    id: 'C',
    name: 'Station C — Kochi Infopark Solar Hub, Kerala',
    shortName: 'Kochi KL',
    hubCode: 'C - Kochi KL',
    coordsLabel: '10.0159° N, 76.3419° E',
    distanceKm: 4.2,
    type: '100% Solar Powered',
    freeChargers: 21,
    queue: 1,
    maxPowerKw: 80,
    avgWaitMin: 3,
    score: 84,
    badge: '100% Solar',
    badgeTone: 'amber',
    mapsQuery: '10.0159,76.3419',
    coords3d: [5.4, 0, -1.8],
    cameraPos: [8.4, 3.8, 2.4],
    hasSolarRoof: true,
  },
];

export const AI_RECOMMENDATIONS = [
  {
    id: 'rec-shift',
    title: 'Shift 42 EVs to Station B (Bengaluru KA)',
    desc: 'Chennai OMR Corridor (TN) is at 94% capacity. Redistribute across the Southern corridor to relieve bottleneck.',
    gain: 'Save 18 kWh · Reduce peak by 12%',
    toastMsg: 'Shifted 42 EVs to Station B (Bengaluru KA) – load balanced',
  },
  {
    id: 'rec-delay',
    title: 'Delay 28 Non-Critical Charges',
    desc: 'Shift to off-peak 02:00–05:00 TN · KA · KL tariff window for ₹2,100 savings.',
    gain: 'Save ₹2,100 · Reduce CO₂ by 4.2 kg',
    toastMsg: 'Delayed 28 non-critical charges – grid stabilised',
  },
  {
    id: 'rec-solar',
    title: 'Use Available Solar Storage (Kochi KL)',
    desc: '36 kWh stored at Kochi Infopark Solar Hub. Deploy now to avoid grid surcharge.',
    gain: 'Save ₹890 · 100% renewable for 14 min',
    toastMsg: 'Kochi KL solar storage deployed – 36 kWh discharged',
  },
];

export const CHARGING_STATIONS_OPTIONS = [
  { label: 'Station A – Chennai OMR Corridor, TN (150 kW Fast)', shortLabel: 'Station A – Chennai TN', kw: 150 },
  { label: 'Station B – Bengaluru Electronic City, KA (240 kW Ultra)', shortLabel: 'Station B – Bengaluru KA', kw: 240 },
  { label: 'Station C – Kochi Infopark Solar Hub, KL (80 kW Solar)', shortLabel: 'Station C – Kochi KL', kw: 80 },
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
  const flaggedIndices = new Set([5, 18, 27]);
  const warnIndices = new Set([2, 9, 13, 21, 24, 30]);

  return Array.from({ length: 32 }, (_, idx) => {
    const id = idx + 1;
    let soh;
    if (flaggedIndices.has(id)) {
      soh = 52 + ((id * 3) % 7);
    } else if (warnIndices.has(id)) {
      soh = 68 + ((id * 5) % 15);
    } else {
      soh = 87 + ((id * 7) % 13);
    }
    const temp = +(24 + (100 - soh) * 0.16).toFixed(1);
    const voltage = +(3.45 + (soh / 100) * 0.72).toFixed(2);
    const cycles = Math.round(900 + (100 - soh) * 18 + (id % 5) * 24);
    return { id, soh, temp, voltage, cycles };
  });
}

export function getSoCCategoryColor(soc) {
  if (soc >= 50) return '#10B981';
  if (soc >= 25) return '#F59E0B';
  return '#EF4444';
}

export function getCellHealthColor(soh) {
  if (soh > 85) return '#10B981';
  if (soh >= 60) return '#F59E0B';
  return '#EF4444';
}
