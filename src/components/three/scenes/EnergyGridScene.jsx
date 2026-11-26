import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { EnergyParticleStream, SleekEVModel, SolarPanelArray, TransmissionTower } from '../SharedModels';

export default function EnergyGridScene({ energyMetrics, routes, balanceRippleKey }) {
  const rippleRef = useRef();
  const rippleTimeRef = useRef(0);
  const lastKeyRef = useRef(balanceRippleKey);

  // Trigger radial floor ripple on "Balance Grid Now"
  if (lastKeyRef.current !== balanceRippleKey) {
    lastKeyRef.current = balanceRippleKey;
    rippleTimeRef.current = 0.001;
  }

  useFrame((_, delta) => {
    if (rippleTimeRef.current > 0 && rippleRef.current) {
      rippleTimeRef.current += delta * 1.15;
      const progress = rippleTimeRef.current;
      if (progress >= 1.5) {
        rippleTimeRef.current = 0;
        rippleRef.current.visible = false;
      } else {
        rippleRef.current.visible = true;
        const s = 1 + progress * 9.5;
        rippleRef.current.scale.set(s, s, 1);
        rippleRef.current.material.opacity = Math.max(0, (1 - progress / 1.5) * 0.65);
      }
    }
  });

  // Conduits representing exact routing splits
  const solarToFleetPts = useMemo(() => [[-4.0, 0.9, -1.6], [-2.0, 1.9, 0.8], [0, 0.75, 3.0]], []);
  const batteryToPeakPts = useMemo(() => [[0, 1.5, -2.5], [0, 2.2, 0.2], [0, 0.75, 3.0]], []);
  const gridToReservePts = useMemo(() => [[4.2, 1.2, -1.4], [2.1, 2.2, -2.0], [0, 1.5, -2.5]], []);

  const solarPct = routes[0]?.pct ?? 58;
  const battPct = routes[1]?.pct ?? 24;
  const gridPct = routes[2]?.pct ?? 18;

  const batteryLevelRatio = Math.min(1, Math.max(0.2, energyMetrics.battReserveKwh / 50));

  return (
    <group>
      {/* Crisp Architectural White Diorama Baseplate */}
      <mesh position={[0, 0.05, 0.2]} receiveShadow castShadow>
        <boxGeometry args={[12.4, 0.1, 8.8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.105, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 5.28, 64]} />
        <meshBasicMaterial color="#E2E8F0" />
      </mesh>

      {/* Expanding Balance Grid Ripple Ring */}
      <mesh
        ref={rippleRef}
        visible={false}
        position={[0, 0.12, 0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.85, 1.0, 64]} />
        <meshBasicMaterial color="#0284C7" transparent opacity={0.6} />
      </mesh>

      {/* 1. SOLAR ARRAY STRUCTURE (142 MW) */}
      <group position={[-4.0, 0.1, -1.6]}>
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.16, 2.8]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
        </mesh>
        <SolarPanelArray position={[0, 0.14, 0]} rows={3} cols={4} spacing={0.72} />
        <Html position={[0, 1.6, 0]} center distanceFactor={13}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-amber-200 bg-white/90 px-3 py-1 text-center shadow-md backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Solar Array</div>
            <div className="text-xs font-extrabold text-slate-900">{energyMetrics.solarMw} MW</div>
          </div>
        </Html>
      </group>

      {/* 2. 36 kWh BATTERY STORAGE TOWER */}
      <group position={[0, 0.1, -2.5]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[1.15, 1.25, 0.2, 32]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.55} roughness={0.3} />
        </mesh>
        {/* Clear Acrylic Outer Monolith */}
        <mesh position={[0, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.78, 0.78, 2.3, 32]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.34}
            roughness={0.12}
            clearcoat={1}
          />
        </mesh>
        {/* Internal Glowing Emerald Charge Core */}
        <mesh position={[0, 0.2 + batteryLevelRatio * 1.05, 0]}>
          <cylinderGeometry args={[0.58, 0.58, batteryLevelRatio * 2.1, 28]} />
          <meshStandardMaterial
            color="#10B981"
            emissive="#10B981"
            emissiveIntensity={0.45}
            roughness={0.25}
          />
        </mesh>
        {/* Brushed Aluminum Cap */}
        <mesh position={[0, 2.55, 0]} castShadow>
          <cylinderGeometry args={[0.82, 0.82, 0.14, 32]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.78} roughness={0.22} />
        </mesh>
        <Html position={[0, 3.05, 0]} center distanceFactor={13}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-emerald-200 bg-white/90 px-3 py-1 text-center shadow-md backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Battery Tower</div>
            <div className="text-xs font-extrabold text-slate-900">{energyMetrics.battReserveKwh} kWh</div>
          </div>
        </Html>
      </group>

      {/* 3. GRID SUBSTATION (87 MW) */}
      <group position={[4.2, 0.1, -1.4]}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.7, 1.9]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.4} metalness={0.18} />
        </mesh>
        <TransmissionTower position={[-0.45, 0.7, 0]} height={2.1} accent="#0284C7" />
        <TransmissionTower position={[0.55, 0.7, 0]} height={1.8} accent="#0284C7" />
        <Html position={[0, 3.15, 0]} center distanceFactor={13}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-sky-200 bg-white/90 px-3 py-1 text-center shadow-md backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Grid Substation</div>
            <div className="text-xs font-extrabold text-slate-900">{energyMetrics.gridMw} MW</div>
          </div>
        </Html>
      </group>

      {/* 4. EV FLEET & PEAK DEMAND TERMINAL */}
      <group position={[0, 0.1, 3.0]}>
        <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
          <boxGeometry args={[4.4, 0.12, 1.8]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
        </mesh>
        <SleekEVModel soc={74} isCharging scale={0.58} position={[-1.0, 0.12, 0]} />
        <SleekEVModel soc={58} isCharging scale={0.58} position={[1.0, 0.12, 0]} />
        <Html position={[0, 1.35, 0]} center distanceFactor={13}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-slate-200 bg-white/90 px-3 py-1 text-center shadow-md backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">EV Fleet Load</div>
            <div className="text-xs font-extrabold text-slate-900">
              {solarPct}% Solar · {battPct}% Battery
            </div>
          </div>
        </Html>
      </group>

      {/* Glossy Conduits scaled dynamically to Routing Splits */}
      <EnergyParticleStream
        points={solarToFleetPts}
        color="#F59E0B"
        count={Math.max(8, Math.round(solarPct / 3))}
        speed={0.22 + solarPct * 0.004}
        radius={0.07 + solarPct * 0.0012}
        tubeRadius={0.03 + solarPct * 0.0008}
      />
      <EnergyParticleStream
        points={batteryToPeakPts}
        color="#10B981"
        count={Math.max(6, Math.round(battPct / 2.5))}
        speed={0.2 + battPct * 0.005}
        radius={0.06 + battPct * 0.0012}
        tubeRadius={0.025 + battPct * 0.0008}
      />
      <EnergyParticleStream
        points={gridToReservePts}
        color="#0284C7"
        count={Math.max(6, Math.round(gridPct / 2.2))}
        speed={0.2 + gridPct * 0.005}
        radius={0.06 + gridPct * 0.0012}
        tubeRadius={0.025 + gridPct * 0.0008}
      />
    </group>
  );
}
