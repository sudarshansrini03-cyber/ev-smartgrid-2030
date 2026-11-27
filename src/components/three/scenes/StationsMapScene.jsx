import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import RegionalGridTerrain from './RegionalGridTerrain';
import { SleekEVModel } from '../SharedModels';
import { STATIONS_DATA } from '../../../data/initialData';

function RotatingSolarCanopy() {
  const panelRef = useRef();
  useFrame(({ clock }) => {
    if (panelRef.current) {
      panelRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.35;
    }
  });
  return (
    <group ref={panelRef} position={[0, 1.38, 0]}>
      <mesh rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[2.1, 0.06, 1.4]} />
        <meshStandardMaterial color="#0284C7" emissive="#F59E0B" emissiveIntensity={0.2} metalness={0.65} roughness={0.18} />
      </mesh>
      <mesh rotation={[0.25, 0, 0]} position={[0, -0.04, 0]}>
        <boxGeometry args={[2.18, 0.04, 1.48]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function StationsMapScene({ selectedStationId, onSelectStation }) {
  return (
    <group>
      <RegionalGridTerrain />

      {STATIONS_DATA.map((st) => {
        const isSelected = selectedStationId === st.id;
        const accent = st.id === 'A' ? '#10B981' : st.id === 'B' ? '#0284C7' : '#F59E0B';
        const visibleQueueCount = Math.min(4, st.queue);

        return (
          <group
            key={st.id}
            position={[st.coords3d[0], 0.28, st.coords3d[2]]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectStation(st);
            }}
          >
            {/* Base Station Pad */}
            <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
              <boxGeometry args={[2.6, 0.1, 2.2]} />
              <meshStandardMaterial
                color={isSelected ? '#F0FDF4' : '#FFFFFF'}
                roughness={0.5}
              />
            </mesh>

            {/* Selection Highlight Border */}
            <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.45, 1.56, 36]} />
              <meshBasicMaterial color={accent} transparent opacity={isSelected ? 0.95 : 0.4} />
            </mesh>

            {/* Architectural Station Canopy / Pylon */}
            <mesh position={[-0.7, 0.65, -0.6]} castShadow>
              <boxGeometry args={[0.16, 1.25, 0.16]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.28} />
            </mesh>
            <mesh position={[0.7, 0.65, -0.6]} castShadow>
              <boxGeometry args={[0.16, 1.25, 0.16]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.28} />
            </mesh>

            {st.hasSolarRoof ? (
              <RotatingSolarCanopy />
            ) : (
              <mesh position={[0, 1.28, -0.25]} castShadow>
                <boxGeometry args={[2.15, 0.12, 1.2]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.35} metalness={0.12} />
              </mesh>
            )}

            {/* Miniature 3D Charging Stalls */}
            {[-0.6, 0, 0.6].map((sx, idx) => (
              <group key={idx} position={[sx, 0.25, -0.75]}>
                <mesh castShadow>
                  <boxGeometry args={[0.14, 0.42, 0.12]} />
                  <meshStandardMaterial color="#F1F5F9" roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.12, 0.065]}>
                  <boxGeometry args={[0.08, 0.14, 0.02]} />
                  <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
                </mesh>
              </group>
            ))}

            {/* Queued Miniature 3D EVs */}
            {Array.from({ length: visibleQueueCount }, (_, qIdx) => (
              <SleekEVModel
                key={qIdx}
                soc={40 + qIdx * 15}
                isCharging={qIdx === 0}
                scale={0.28}
                compact
                position={[-0.65 + qIdx * 0.55, 0.1, 0.45]}
                rotation={[0, Math.PI / 2, 0]}
              />
            ))}

            {/* Crisp White World-Space Badge */}
            <Html position={[0, 2.15, 0]} center distanceFactor={14}>
              <button
                onClick={() => onSelectStation(st)}
                className={`group flex flex-col items-center rounded-xl border px-3 py-1.5 text-left shadow-md backdrop-blur-xl transition-all hover:scale-105 ${
                  isSelected
                    ? 'border-emerald-400 bg-white/95 ring-2 ring-emerald-500/25'
                    : 'border-slate-200/90 bg-white/85'
                }`}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="text-[11px] font-bold text-slate-900">
                    Station {st.id} · {st.shortName}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-[10px] font-medium text-slate-600">
                  <span className="font-semibold text-emerald-600">{st.freeChargers} Free</span>
                  <span>•</span>
                  <span>Queue: {st.queue} EVs</span>
                </div>
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
