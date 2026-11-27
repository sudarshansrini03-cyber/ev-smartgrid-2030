import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { EnergyParticleStream, SleekEVModel } from '../SharedModels';

export default function ChargingBayScene({
  vehicle,
  currentSoC,
  targetSoC,
  isCharging,
  powerKw,
  stationName,
}) {
  const cablePoints = useMemo(
    () => [
      [-2.15, 1.45, -0.3],
      [-1.55, 1.05, 0.25],
      [-0.95, 0.45, 0.55],
      [-0.25, 0.42, 0.62],
      [0.35, 0.44, 0.52],
    ],
    []
  );

  const cableGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(cablePoints.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 48, 0.045, 12, false);
  }, [cablePoints]);

  return (
    <group position={[0, 0, 0]}>
      {/* Clean Studio Bay Floor Plate */}
      <mesh position={[0.2, 0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[7.4, 0.06, 4.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.55} />
      </mesh>
      {/* Brushed Aluminum Guide Rails */}
      <mesh position={[0.6, 0.08, 1.38]} castShadow>
        <boxGeometry args={[4.4, 0.06, 0.09]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[0.6, 0.08, -1.38]} castShadow>
        <boxGeometry args={[4.4, 0.06, 0.09]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Minimalist White 3D Fast-Charging Pedestal */}
      <group position={[-2.4, 0.06, -0.3]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.92, 0.12, 0.92]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.56, 2.15, 0.42]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.32} metalness={0.08} />
        </mesh>
        {/* Digital Telemetry Screen */}
        <mesh position={[0, 1.48, 0.215]}>
          <planeGeometry args={[0.38, 0.54]} />
          <meshStandardMaterial
            color="#0F172A"
            emissive={isCharging ? '#0284C7' : '#10B981'}
            emissiveIntensity={0.35}
          />
        </mesh>
        {/* Top Light Crown */}
        <mesh position={[0, 2.24, 0]}>
          <boxGeometry args={[0.58, 0.06, 0.44]} />
          <meshStandardMaterial
            color={isCharging ? '#0284C7' : '#10B981'}
            emissive={isCharging ? '#0284C7' : '#10B981'}
            emissiveIntensity={0.85}
          />
        </mesh>
        <Html position={[0, 2.6, 0]} center distanceFactor={10}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1 text-center shadow-md backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {stationName}
            </div>
            <div className="text-xs font-extrabold text-sky-600">{powerKw} kW DC Pedestal</div>
          </div>
        </Html>
      </group>

      {/* Physical Curved 3D Charging Cable */}
      <mesh geometry={cableGeometry} castShadow>
        <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.2} />
      </mesh>

      {/* Energy Pulses Traveling Along Cable When Charging */}
      {isCharging && (
        <>
          <EnergyParticleStream
            points={cablePoints}
            color="#0284C7"
            count={14}
            speed={0.65}
            radius={0.068}
            showTube={false}
          />
          <EnergyParticleStream
            points={cablePoints}
            color="#10B981"
            count={8}
            speed={0.48}
            radius={0.055}
            showTube={false}
          />
        </>
      )}

      {/* Sleek 3D EV in Charging Bay */}
      <SleekEVModel
        soc={currentSoC}
        isCharging={isCharging}
        scale={1.08}
        position={[0.85, 0.06, 0]}
      />

      {/* Target SoC Marker Badge */}
      <Html position={[0.85, 1.98, 0]} center distanceFactor={10}>
        <div className="pointer-events-none flex flex-col items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-1.5 shadow-md backdrop-blur-xl">
          {vehicle && (
            <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-sky-700">
              {vehicle.id} · {vehicle.model}
            </div>
          )}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className={`h-2 w-2 rounded-full ${
                isCharging ? 'animate-ping bg-sky-500' : 'bg-emerald-500'
              }`}
            />
            <span className="font-mono text-xs font-bold text-slate-900">
              {Math.round(currentSoC)}% → {targetSoC}%
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}
