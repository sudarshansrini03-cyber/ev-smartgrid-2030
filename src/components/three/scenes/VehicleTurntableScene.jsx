import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SleekEVModel } from '../SharedModels';
import { getSoCCategoryColor } from '../../../data/initialData';

export default function VehicleTurntableScene({ vehicle }) {
  const turntableRef = useRef();

  useFrame((_, delta) => {
    if (turntableRef.current) {
      turntableRef.current.rotation.y += delta * 0.35;
    }
  });

  if (!vehicle) return null;
  const isCharging = vehicle.status === 'Charging';
  const socColor = getSoCCategoryColor(vehicle.soc);

  return (
    <group position={[0, 0, 0]}>
      {/* Minimalist Circular White Studio Plinth */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.7, 2.85, 0.2, 64]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.35} metalness={0.08} />
      </mesh>
      {/* Brushed Aluminum Plinth Rim Ring */}
      <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.56, 2.7, 64]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.75} roughness={0.22} />
      </mesh>
      {/* Active Status Accent Ring */}
      <mesh position={[0, 0.208, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.22, 2.26, 64]} />
        <meshBasicMaterial color={isCharging ? '#0284C7' : socColor} transparent opacity={0.75} />
      </mesh>

      {/* Rotating Turntable Group */}
      <group ref={turntableRef} position={[0, 0.21, 0]}>
        <SleekEVModel soc={vehicle.soc} isCharging={isCharging} scale={1.15} />
      </group>

      {/* Studio Spec Tag Floating Above Turntable */}
      <Html position={[0, 2.05, 0]} center distanceFactor={9}>
        <div className="pointer-events-none flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/85 px-4 py-2 shadow-lg backdrop-blur-xl">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {vehicle.id} · {vehicle.owner}
            </div>
            <div className="text-xs font-bold text-slate-900">{vehicle.model}</div>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400">SoC</div>
            <div className="font-mono text-sm font-extrabold" style={{ color: socColor }}>
              {vehicle.soc}%
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
