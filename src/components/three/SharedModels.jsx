import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getSoCCategoryColor } from '../../data/initialData';

/**
 * Sleek Polestar-inspired 3D EV with translucent frosted-glass body shell,
 * brushed aluminum trim, internal dynamic SoC battery mesh, and charging wheel rings.
 */
export function SleekEVModel({
  soc = 60,
  isCharging = false,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  compact = false,
  accentColor,
}) {
  const wheelRingRefs = useRef([]);
  const batteryMeshRef = useRef();

  const clampedSoc = Math.max(2, Math.min(100, soc));
  const batteryColor = accentColor || getSoCCategoryColor(clampedSoc);
  const batteryFillRatio = clampedSoc / 100;

  const cabinShape = useMemo(() => {
    const shape = new THREE.Shape();
    // Side profile (x = length along car, y = height)
    shape.moveTo(-1.35, 0.25);
    shape.lineTo(-1.25, 0.56);
    shape.quadraticCurveTo(-0.85, 0.72, -0.45, 0.92);
    shape.quadraticCurveTo(0.05, 1.04, 0.58, 0.94);
    shape.quadraticCurveTo(1.05, 0.78, 1.32, 0.54);
    shape.lineTo(1.38, 0.25);
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = useMemo(
    () => ({
      depth: 1.24,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 4,
    }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (isCharging) {
      wheelRingRefs.current.forEach((ring, idx) => {
        if (!ring) return;
        const pulse = 1 + Math.sin(t * 4.5 + idx * 0.5) * 0.08;
        ring.scale.set(pulse, pulse, 1);
        if (ring.material) {
          ring.material.opacity = 0.5 + Math.sin(t * 4.5 + idx * 0.5) * 0.32;
        }
      });
    }
    if (batteryMeshRef.current) {
      const targetScaleX = Math.max(0.04, batteryFillRatio);
      batteryMeshRef.current.scale.x = THREE.MathUtils.lerp(
        batteryMeshRef.current.scale.x,
        targetScaleX,
        0.1
      );
      const maxLen = 1.66;
      batteryMeshRef.current.position.x = -maxLen / 2 + (maxLen * batteryMeshRef.current.scale.x) / 2;
    }
  });

  const wheelPositions = [
    [-0.86, 0.26, 0.68],
    [0.86, 0.26, 0.68],
    [-0.86, 0.26, -0.68],
    [0.86, 0.26, -0.68],
  ];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Brushed aluminum skateboard underbody */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.76, 0.14, 1.32]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.55} roughness={0.3} />
      </mesh>

      {/* Matte white lower aero sill */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.86, 0.14, 1.36]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.35} metalness={0.08} />
      </mesh>

      {/* Translucent frosted-glass upper body shell */}
      <mesh
        position={[0, 0.06, -0.62]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[cabinShape, extrudeSettings]} />
        <meshPhysicalMaterial
          color="#F8FAFC"
          transparent
          opacity={compact ? 0.62 : 0.44}
          roughness={0.14}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
          ior={1.45}
          depthWrite={false}
        />
      </mesh>

      {/* Internal clear acrylic battery pack frame */}
      {!compact && (
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.72, 0.18, 0.86]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.28}
            roughness={0.15}
            clearcoat={0.8}
          />
        </mesh>
      )}

      {/* Dynamic Internal Solid Battery Pack Mesh */}
      <mesh ref={batteryMeshRef} position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.66, 0.14, 0.78]} />
        <meshStandardMaterial
          color={batteryColor}
          emissive={batteryColor}
          emissiveIntensity={isCharging ? 0.55 : 0.25}
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      {/* Front & Rear LED Light Bars */}
      <mesh position={[1.44, 0.42, 0]}>
        <boxGeometry args={[0.04, 0.06, 1.12]} />
        <meshStandardMaterial color="#0284C7" emissive="#0284C7" emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[-1.44, 0.44, 0]}>
        <boxGeometry args={[0.04, 0.05, 1.08]} />
        <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.65} />
      </mesh>

      {/* Wheels & Pulsing Charging Energy Rings */}
      {wheelPositions.map((pos, idx) => (
        <group key={idx} position={pos}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.18, 24]} />
            <meshStandardMaterial color="#1E293B" roughness={0.65} metalness={0.2} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.19, 18]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.22} />
          </mesh>
          {isCharging && (
            <mesh
              ref={(el) => (wheelRingRefs.current[idx] = el)}
              position={[0, 0, pos[2] > 0 ? 0.11 : -0.11]}
            >
              <torusGeometry args={[0.31, 0.022, 12, 32]} />
              <meshBasicMaterial color="#0284C7" transparent opacity={0.75} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * InstancedMesh 60 FPS energy particle stream flowing along a 3D CatmullRomCurve3.
 */
export function EnergyParticleStream({
  points,
  color = '#0284C7',
  count = 16,
  speed = 0.28,
  radius = 0.08,
  tubeRadius = 0.032,
  showTube = true,
  reverse = false,
}) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const curve = useMemo(() => {
    const vectors = points.map((p) => new THREE.Vector3(...p));
    return new THREE.CatmullRomCurve3(vectors);
  }, [points]);

  const tubeGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 48, tubeRadius, 10, false),
    [curve, tubeRadius]
  );

  useFrame(({ clock }) => {
    if (!instancedRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      let progress = ((t * speed + i / count) % 1 + 1) % 1;
      if (reverse) progress = 1 - progress;
      const pos = curve.getPointAt(progress);
      dummy.position.copy(pos);
      const pulse = 0.85 + Math.sin(t * 5 + i) * 0.2;
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, dummy.matrix);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {showTube && (
        <mesh geometry={tubeGeometry}>
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={0.22}
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>
      )}
      <instancedMesh ref={instancedRef} args={[null, null, count]}>
        <sphereGeometry args={[radius, 14, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.15}
          metalness={0.2}
        />
      </instancedMesh>
    </group>
  );
}

/**
 * Minimalist brushed-aluminum architectural transmission tower.
 */
export function TransmissionTower({ position = [0, 0, 0], height = 2.6, accent = '#0284C7' }) {
  return (
    <group position={position}>
      {/* Base plinth */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.16, 0.52]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.6} />
      </mesh>
      {/* Brushed aluminum mast */}
      <mesh position={[0, height / 2 + 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.11, height, 8]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.75} roughness={0.28} />
      </mesh>
      {/* Cross arms */}
      <mesh position={[0, height * 0.85, 0]} castShadow>
        <boxGeometry args={[0.95, 0.06, 0.08]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, height * 0.65, 0]} castShadow>
        <boxGeometry args={[0.7, 0.05, 0.07]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Glowing insulator beacon */}
      <mesh position={[0, height + 0.18, 0]}>
        <sphereGeometry args={[0.09, 14, 14]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}

/**
 * InstancedMesh miniature architectural solar farm.
 */
export function SolarPanelArray({ position = [0, 0, 0], rows = 3, cols = 4, spacing = 0.68, scale = 1 }) {
  const panelRef = useRef();
  const frameRef = useRef();
  const total = rows * cols;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  React.useLayoutEffect(() => {
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * spacing;
        const z = (r - (rows - 1) / 2) * spacing;
        dummy.position.set(x, 0.24, z);
        dummy.rotation.set(0.45, 0, 0);
        dummy.updateMatrix();
        panelRef.current?.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(x, 0.22, z);
        dummy.updateMatrix();
        frameRef.current?.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    if (panelRef.current) panelRef.current.instanceMatrix.needsUpdate = true;
    if (frameRef.current) frameRef.current.instanceMatrix.needsUpdate = true;
  }, [rows, cols, spacing, dummy]);

  return (
    <group position={position} scale={scale}>
      <instancedMesh ref={frameRef} args={[null, null, total]} castShadow>
        <boxGeometry args={[0.56, 0.04, 0.42]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.5} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={panelRef} args={[null, null, total]} castShadow>
        <boxGeometry args={[0.52, 0.045, 0.38]} />
        <meshStandardMaterial color="#0284C7" emissive="#F59E0B" emissiveIntensity={0.14} metalness={0.65} roughness={0.18} />
      </instancedMesh>
    </group>
  );
}
