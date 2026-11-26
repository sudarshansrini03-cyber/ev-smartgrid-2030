import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { EnergyParticleStream, SleekEVModel } from '../SharedModels';

export default function P2PBridgeScene({ seller, buyer, energyKwh, isCalculated, transferPulseKey }) {
  const bridgePoints = useMemo(
    () => [
      [-2.3, 0.68, 0],
      [-1.15, 2.25, 0],
      [0, 2.65, 0],
      [1.15, 2.25, 0],
      [2.3, 0.68, 0],
    ],
    []
  );

  const isFlowActive = isCalculated || transferPulseKey > 0;

  return (
    <group position={[0, 0, 0]}>
      {/* Clean Studio Platform */}
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[8.8, 0.12, 3.8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>
      {/* Brushed Aluminum Center Divider */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.06, 0.03, 3.2]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Seller EV (Left, facing right toward Buyer) */}
      <group position={[-2.65, 0.12, 0]}>
        <SleekEVModel
          soc={seller?.soc ?? 55}
          isCharging={isFlowActive}
          scale={1.02}
          rotation={[0, 0, 0]}
        />
        <Html position={[0, 1.85, 0]} center distanceFactor={11}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-amber-200 bg-white/90 px-3 py-1 text-center shadow-md backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Seller EV</div>
            <div className="text-xs font-extrabold text-slate-900">
              {seller?.id} · {seller?.soc ?? 0}%
            </div>
          </div>
        </Html>
      </group>

      {/* Buyer EV (Right, facing left toward Seller) */}
      <group position={[2.65, 0.12, 0]}>
        <SleekEVModel
          soc={buyer?.soc ?? 32}
          isCharging={isFlowActive}
          scale={1.02}
          rotation={[0, Math.PI, 0]}
        />
        <Html position={[0, 1.85, 0]} center distanceFactor={11}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-emerald-200 bg-white/90 px-3 py-1 text-center shadow-md backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Buyer EV</div>
            <div className="text-xs font-extrabold text-slate-900">
              {buyer?.id} · {buyer?.soc ?? 0}%
            </div>
          </div>
        </Html>
      </group>

      {/* Arched P2P Energy Conduit + Flowing Emerald/Blue Spheres */}
      <EnergyParticleStream
        points={bridgePoints}
        color={isFlowActive ? '#10B981' : '#94A3B8'}
        count={isFlowActive ? 16 : 6}
        speed={isFlowActive ? 0.55 : 0.12}
        radius={isFlowActive ? 0.085 : 0.045}
        tubeRadius={0.04}
      />
      {isFlowActive && (
        <EnergyParticleStream
          points={bridgePoints}
          color="#0284C7"
          count={10}
          speed={0.42}
          radius={0.065}
          showTube={false}
        />
      )}

      {/* Center Bridge Label */}
      <Html position={[0, 3.1, 0]} center distanceFactor={11}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-slate-200 bg-white/90 px-3.5 py-1 text-xs font-bold text-slate-800 shadow-md backdrop-blur-xl">
          ⚡ {energyKwh || 0} kWh P2P Bridge
        </div>
      </Html>
    </group>
  );
}
