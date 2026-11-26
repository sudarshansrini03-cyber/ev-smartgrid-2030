import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { getCellHealthColor } from '../../../data/initialData';

export default function BatteryCutawayScene({
  cells,
  selectedCell,
  hoveredCell,
  onHoverCell,
  onSelectCell,
  exploded = true,
  optimizeAnimKey,
}) {
  const scannerRef = useRef();
  const scanProgressRef = useRef(0);
  const lastKeyRef = useRef(optimizeAnimKey);

  if (lastKeyRef.current !== optimizeAnimKey) {
    lastKeyRef.current = optimizeAnimKey;
    scanProgressRef.current = 0.001;
  }

  useFrame((_, delta) => {
    if (scanProgressRef.current > 0 && scannerRef.current) {
      scanProgressRef.current += delta * 0.85;
      if (scanProgressRef.current >= 1) {
        scanProgressRef.current = 0;
        scannerRef.current.visible = false;
      } else {
        scannerRef.current.visible = true;
        scannerRef.current.position.x = THREE.MathUtils.lerp(-2.5, 2.5, scanProgressRef.current);
      }
    }
  });

  const activeCell = hoveredCell || selectedCell;
  const bankBetaLift = exploded ? 1.85 : 1.05;
  const acrylicLift = exploded ? 1.15 : 0.62;

  return (
    <group position={[0, 0.15, 0]}>
      {/* Main Brushed Aluminum Structural Baseplate (Bank Alpha Tray) */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.4, 0.2, 3.0]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[5.0, 0.06, 2.65]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>

      {/* Bank Alpha Title Plate */}
      <Html position={[-2.1, 0.35, 1.75]} center distanceFactor={11}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-emerald-200 bg-white/90 px-3 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm backdrop-blur-md">
          Bank Alpha · 80% Main Traction (32 Cells)
        </div>
      </Html>

      {/* 32 Individual 3D Cylindrical/Prismatic Cells (8 cols x 4 rows) */}
      {cells.map((cell, idx) => {
        const col = idx % 8;
        const row = Math.floor(idx / 8);
        const x = (col - 3.5) * 0.56;
        const z = (row - 1.5) * 0.56;
        const color = getCellHealthColor(cell.soh);
        const isActive = activeCell?.id === cell.id;
        const isCritical = cell.soh < 60;

        return (
          <group key={cell.id} position={[x, 0.52, z]}>
            {/* Brushed Aluminum Cell Cap */}
            <mesh position={[0, 0.29, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.04, 18]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Interactive Color-Coded Cell Cylinder */}
            <mesh
              castShadow
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
                onHoverCell(cell);
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
                onHoverCell(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCell(cell);
              }}
              scale={isActive ? [1.14, 1.12, 1.14] : [1, 1, 1]}
            >
              <cylinderGeometry args={[0.19, 0.19, 0.54, 20]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isActive ? 0.6 : isCritical ? 0.42 : 0.18}
                roughness={0.28}
                metalness={0.2}
              />
            </mesh>

            {/* Floating White Tooltip on Hover or Click */}
            {isActive && (
              <Html position={[0, 0.72, 0]} center distanceFactor={9}>
                <div className="pointer-events-none w-40 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-900">Cell #{cell.id}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {cell.soh}% SoH
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                    <span>Temp: <strong className="text-slate-900">{cell.temp}°C</strong></span>
                    <span>Volt: <strong className="text-slate-900">{cell.voltage}V</strong></span>
                    <span className="col-span-2">Cycles: <strong className="text-slate-900">{cell.cycles}</strong></span>
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Calibration Light-Beam Scanner Bar (triggered by Optimize Banks) */}
      <mesh ref={scannerRef} visible={false} position={[-2.5, 0.65, 0]}>
        <boxGeometry args={[0.12, 0.85, 2.7]} />
        <meshBasicMaterial color="#0284C7" transparent opacity={0.45} />
      </mesh>

      {/* Clear Acrylic Cutaway Cover for Bank Alpha */}
      <mesh position={[0, acrylicLift, 0]}>
        <boxGeometry args={[5.15, 0.08, 2.8]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          transparent
          opacity={0.34}
          roughness={0.08}
          clearcoat={1}
          ior={1.48}
        />
      </mesh>

      {/* Brushed Aluminum Exploded Guide Struts */}
      {[
        [-2.45, -1.25],
        [2.45, -1.25],
        [-2.45, 1.25],
        [2.45, 1.25],
      ].map(([sx, sz], idx) => (
        <mesh key={idx} position={[sx, bankBetaLift / 2, sz]}>
          <cylinderGeometry args={[0.025, 0.025, bankBetaLift, 12]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}

      {/* BANK BETA (20% Auxiliary Reserve) — Upper Exploded Module */}
      <group position={[0, bankBetaLift, 0]}>
        <mesh castShadow>
          <boxGeometry args={[3.4, 0.16, 1.85]} />
          <meshStandardMaterial color="#F1F5F9" metalness={0.45} roughness={0.3} />
        </mesh>
        {/* 6 Reserve Prismatic Modules in Cobalt Blue */}
        {[-1.1, -0.66, -0.22, 0.22, 0.66, 1.1].map((mx, i) => (
          <mesh key={i} position={[mx, 0.22, 0]} castShadow>
            <boxGeometry args={[0.32, 0.28, 1.38]} />
            <meshStandardMaterial
              color="#0284C7"
              emissive="#0284C7"
              emissiveIntensity={0.22}
              roughness={0.25}
              metalness={0.2}
            />
          </mesh>
        ))}
        {/* Clear Acrylic Top Lid */}
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[3.45, 0.06, 1.9]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.32}
            roughness={0.08}
            clearcoat={1}
          />
        </mesh>

        <Html position={[0, 0.85, 0]} center distanceFactor={11}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-sky-200 bg-white/90 px-3 py-0.5 text-[10px] font-bold text-sky-700 shadow-sm backdrop-blur-md">
            Bank Beta · 20% Auxiliary Reserve (98% SoH)
          </div>
        </Html>
      </group>
    </group>
  );
}
