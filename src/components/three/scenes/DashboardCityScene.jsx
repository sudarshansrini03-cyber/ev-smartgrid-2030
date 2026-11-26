import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import MumbaiTerrain from './MumbaiTerrain';
import {
  EnergyParticleStream,
  SleekEVModel,
  SolarPanelArray,
  TransmissionTower,
} from '../SharedModels';
import { STATIONS_DATA } from '../../../data/initialData';

export default function DashboardCityScene({ stats, simPulseKey }) {
  const evRefs = useRef([]);
  const isHighDemand = stats.demand >= 75;
  const demandColor = isHighDemand ? '#EF4444' : '#0284C7';
  const solarColor = '#F59E0B';
  const flowSpeed = 0.22 + (stats.solar / 100) * 0.2 + (isHighDemand ? 0.14 : 0);

  // Moving low-poly EV cars gliding along arterial corridors
  const movingEvs = useMemo(
    () => [
      { axis: 'x', fixed: 0.5, range: 6.2, speed: 0.75, offset: 0, soc: 76 },
      { axis: 'x', fixed: 0.38, range: 6.0, speed: -0.62, offset: 2.1, soc: 44 },
      { axis: 'z', fixed: 0.8, range: 4.3, speed: 0.68, offset: 1.4, soc: 88 },
      { axis: 'z', fixed: 0.92, range: 4.1, speed: -0.58, offset: 3.6, soc: 32 },
    ],
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    movingEvs.forEach((car, idx) => {
      const mesh = evRefs.current[idx];
      if (!mesh) return;
      const wave = Math.sin(t * car.speed * 0.45 + car.offset) * car.range;
      if (car.axis === 'x') {
        mesh.position.set(wave, 0.28, car.fixed);
        mesh.rotation.y = Math.cos(t * car.speed * 0.45 + car.offset) * car.speed > 0 ? 0 : Math.PI;
      } else {
        mesh.position.set(car.fixed, 0.28, wave);
        mesh.rotation.y =
          Math.cos(t * car.speed * 0.45 + car.offset) * car.speed > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
    });
  });

  // Conduits from Solar Farm -> Stations & Substation -> Stations
  const solarToC = useMemo(() => [[6.4, 0.8, 2.8], [6.0, 1.5, 0.5], [5.4, 0.85, -1.8]], []);
  const solarToB = useMemo(() => [[6.4, 0.8, 2.8], [3.0, 2.1, 3.4], [-0.8, 0.85, 3.4]], []);
  const gridToA = useMemo(() => [[-5.6, 1.2, 2.4], [-5.8, 2.2, 0.0], [-5.2, 0.85, -2.6]], []);
  const gridToB = useMemo(() => [[-5.6, 1.2, 2.4], [-3.2, 2.1, 3.1], [-0.8, 0.85, 3.4]], []);
  const aToC = useMemo(() => [[-5.2, 0.85, -2.6], [0.1, 2.3, -2.4], [5.4, 0.85, -1.8]], []);

  return (
    <group key={simPulseKey > 0 ? 'active-grid' : 'init-grid'}>
      <MumbaiTerrain showTraffic />

      {/* Miniature 3D Solar Farm (Powai East Ridge) */}
      <group position={[6.4, 0.28, 2.8]}>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[3.1, 0.08, 2.4]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.7} />
        </mesh>
        <SolarPanelArray position={[0, 0.05, 0]} rows={3} cols={4} spacing={0.62} />
        <Html position={[0, 1.25, 0]} center distanceFactor={16}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-amber-200 bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 shadow-sm backdrop-blur-md">
            ☀️ Solar Farm · {stats.solar}%
          </div>
        </Html>
      </group>

      {/* Minimalist Grid Substation + Transmission Towers */}
      <group position={[-5.6, 0.28, 2.4]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[1.4, 0.5, 1.2]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.45} metalness={0.2} />
        </mesh>
        <TransmissionTower position={[0, 0.5, 0]} height={2.0} accent={demandColor} />
        <Html position={[0, 2.9, 0]} center distanceFactor={16}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-sky-200 bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm backdrop-blur-md">
            ⚡ Grid Demand · {stats.demand}%
          </div>
        </Html>
      </group>

      <TransmissionTower position={[0.1, 0.28, -2.4]} height={2.1} accent={demandColor} />
      <TransmissionTower position={[3.0, 0.28, 3.4]} height={1.9} accent={solarColor} />

      {/* 3 Architectural Charging Hub Nodes */}
      {STATIONS_DATA.map((st) => {
        const nodeAccent = isHighDemand && st.id === 'A' ? '#EF4444' : st.id === 'C' ? '#F59E0B' : '#10B981';
        return (
          <group key={st.id} position={[st.coords3d[0], 0.28, st.coords3d[2]]}>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.55, 0.68, 0.56, 24]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.35} metalness={0.12} />
            </mesh>
            <mesh position={[0, 0.58, 0]}>
              <cylinderGeometry args={[0.42, 0.42, 0.08, 24]} />
              <meshStandardMaterial color={nodeAccent} emissive={nodeAccent} emissiveIntensity={0.65} />
            </mesh>
            <Html position={[0, 1.15, 0]} center distanceFactor={16}>
              <div className="pointer-events-none whitespace-nowrap rounded-lg border border-slate-200/90 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm backdrop-blur-md">
                Hub {st.id} · {st.freeChargers} Free
              </div>
            </Html>
          </group>
        );
      })}

      {/* Elevated Energy Conduits & InstancedMesh Streams */}
      <EnergyParticleStream points={solarToC} color={solarColor} count={14} speed={flowSpeed} radius={0.085} />
      <EnergyParticleStream points={solarToB} color={solarColor} count={16} speed={flowSpeed * 0.95} radius={0.085} />
      <EnergyParticleStream points={gridToA} color={demandColor} count={14} speed={flowSpeed * 1.1} radius={0.085} />
      <EnergyParticleStream points={gridToB} color={demandColor} count={14} speed={flowSpeed} radius={0.085} />
      <EnergyParticleStream points={aToC} color="#10B981" count={16} speed={flowSpeed * 0.85} radius={0.075} />

      {/* Moving Low-Poly White/Silver EVs */}
      {movingEvs.map((car, idx) => (
        <group key={idx} ref={(el) => (evRefs.current[idx] = el)}>
          <SleekEVModel soc={car.soc} scale={0.28} compact />
        </group>
      ))}
    </group>
  );
}
