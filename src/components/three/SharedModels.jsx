import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getSoCCategoryColor } from '../../data/initialData';

// ─── Utility: build a smooth extruded shape ───────────────────────────────────
function buildExtrudedShape(points, depth, bevel = 0.06, bevelSegments = 5) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.length === 6) {
      shape.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    } else if (p.length === 4) {
      shape.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    } else {
      shape.lineTo(p[0], p[1]);
    }
  }
  shape.closePath();
  return {
    shape,
    settings: {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel * 0.72,
      bevelSize: bevel,
      bevelSegments,
    },
  };
}

/**
 * Sculpted Porsche Taycan Turbo S 3D model:
 * - Low-slung, wide-stance sports sedan silhouette via smooth ExtrudeGeometry
 * - Sculpted teardrop dark smoked-glass fastback cabin canopy
 * - Translucent X-ray frosted satin-white body shell (opacity 0.72, clearcoat 1.0)
 * - Glowing internal underfloor skateboard battery pack (scaled dynamically to SoC %)
 * - Recessed front air-curtains with 4-point ice-blue/white LED DRL clusters
 * - Full-width crimson LED light bar across rear decklid
 * - 4 Mission-E two-tone aero turbine wheels inside dark wheel wells + brake discs + yellow calipers
 * - Pulsing cyan energy rings when Charging
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
  const drlRefs = useRef([]);

  const clampedSoc = Math.max(2, Math.min(100, soc));
  const batteryColor = accentColor || getSoCCategoryColor(clampedSoc);
  const batteryFillRatio = clampedSoc / 100;

  // ── Taycan low-slung coupe-sedan main lower/shoulder body silhouette ─────────
  const { shape: bodyShape, settings: bodyExtrudeSettings } = useMemo(() => {
    return buildExtrudedShape(
      [
        // Rear bumper bottom
        [-1.58, 0.21],
        // Rear diffuser upsweep to tail decklid
        [-1.62, 0.56],
        // Muscular rear decklid / fastback shoulder
        [-1.36, 0.68, -1.04, 0.94, -0.42, 1.02],
        // Coupe roof peak to top of windshield
        [-0.08, 1.05, 0.26, 1.02, 0.54, 0.84],
        // Low sculpted Taycan hood sweeping down toward nose
        [0.86, 0.65, 1.24, 0.59, 1.54, 0.46],
        // Sharp front nose drop to splitter
        [1.62, 0.36, 1.62, 0.24, 1.56, 0.20],
        // Flat underbody back to rear
        [-1.58, 0.21],
      ],
      1.26,
      0.085,
      6
    );
  }, []);

  // ── Sculpted teardrop dark smoked-glass fastback canopy ──────────────────────
  const { shape: canopyShape, settings: canopyExtrudeSettings } = useMemo(() => {
    return buildExtrudedShape(
      [
        [-1.16, 0.64],
        [-0.92, 0.86, -0.52, 1.02, -0.06, 1.05],
        [0.24, 1.03, 0.50, 0.86, 0.72, 0.68],
        [0.52, 0.63, -0.35, 0.62, -1.16, 0.64],
      ],
      1.02,
      0.045,
      5
    );
  }, []);

  // ── Front aerodynamic splitter ───────────────────────────────────────────────
  const { shape: splitterShape, settings: splitterSettings } = useMemo(() => {
    return buildExtrudedShape(
      [
        [1.26, 0.14],
        [1.65, 0.14],
        [1.67, 0.20],
        [1.56, 0.22],
        [1.26, 0.20],
      ],
      1.36,
      0.018,
      3
    );
  }, []);

  // ── Sleek rear aerodynamic diffuser ──────────────────────────────────────────
  const { shape: diffuserShape, settings: diffuserSettings } = useMemo(() => {
    return buildExtrudedShape(
      [
        [-1.63, 0.14],
        [-1.34, 0.14],
        [-1.32, 0.23],
        [-1.60, 0.26],
      ],
      1.32,
      0.018,
      3
    );
  }, []);

  // ── Sculpted side skirts ─────────────────────────────────────────────────────
  const { shape: skirtShape, settings: skirtSettings } = useMemo(() => {
    return buildExtrudedShape(
      [
        [-0.72, 0.14],
        [0.72, 0.14],
        [0.70, 0.22],
        [-0.70, 0.22],
      ],
      0.06,
      0.012,
      2
    );
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    drlRefs.current.forEach((ref, idx) => {
      if (ref?.material) {
        ref.material.emissiveIntensity = 0.85 + Math.sin(t * 2.4 + idx * 0.4) * 0.2;
      }
    });

    if (isCharging) {
      wheelRingRefs.current.forEach((ring, idx) => {
        if (!ring) return;
        const pulse = 1 + Math.sin(t * 4.5 + idx * 0.5) * 0.08;
        ring.scale.set(pulse, pulse, 1);
        if (ring.material) {
          ring.material.opacity = 0.45 + Math.sin(t * 4.5 + idx * 0.5) * 0.35;
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
      batteryMeshRef.current.position.x =
        -maxLen / 2 + (maxLen * batteryMeshRef.current.scale.x) / 2;
    }
  });

  // Wheel centers at y = 0.28 so 0.28 radius sits flush on y = 0 turntable surface
  const wheelPositions = [
    [1.02, 0.28, 0.69],
    [1.02, 0.28, -0.69],
    [-1.02, 0.28, 0.69],
    [-1.02, 0.28, -0.69],
  ];

  // Signature Porsche 4-point ice-blue LED DRL quad inside each front intake
  const drlQuadOffsets = [
    [0.032, 0.024],
    [-0.032, 0.024],
    [0.032, -0.024],
    [-0.032, -0.024],
  ];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ── Brushed-aluminum skateboard floorpan chassis ── */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.92, 0.07, 1.24]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.26} />
      </mesh>

      {/* ── Translucent acrylic battery housing inside wheelbase ── */}
      {!compact && (
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[1.74, 0.14, 1.02]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.24}
            roughness={0.12}
            clearcoat={0.9}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ── Dynamic glowing underfloor SoC battery pack (visible through X-ray shell) ── */}
      <mesh ref={batteryMeshRef} position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.66, 0.10, 0.92]} />
        <meshStandardMaterial
          color={batteryColor}
          emissive={batteryColor}
          emissiveIntensity={isCharging ? 0.8 : 0.4}
          roughness={0.2}
          metalness={0.12}
        />
      </mesh>

      {/* ── Sleek X-Ray Frosted Satin-White Porsche Taycan Outer Body Shell ── */}
      <mesh position={[0, 0.05, -0.63]} castShadow receiveShadow>
        <extrudeGeometry args={[bodyShape, bodyExtrudeSettings]} />
        <meshPhysicalMaterial
          color="#F8FAFC"
          transparent
          opacity={0.72}
          roughness={0.12}
          metalness={0.05}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
          ior={1.46}
          depthWrite={false}
        />
      </mesh>

      {/* ── Muscular Wide Front & Rear Fender Haunches ── */}
      <mesh position={[-1.02, 0.43, 0.56]} scale={[1.42, 0.62, 0.52]} castShadow>
        <sphereGeometry args={[0.35, 22, 14]} />
        <meshPhysicalMaterial
          color="#F8FAFC"
          transparent
          opacity={0.68}
          roughness={0.12}
          clearcoat={1.0}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-1.02, 0.43, -0.56]} scale={[1.42, 0.62, 0.52]} castShadow>
        <sphereGeometry args={[0.35, 22, 14]} />
        <meshPhysicalMaterial
          color="#F8FAFC"
          transparent
          opacity={0.68}
          roughness={0.12}
          clearcoat={1.0}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[1.02, 0.39, 0.55]} scale={[1.3, 0.55, 0.48]} castShadow>
        <sphereGeometry args={[0.33, 20, 14]} />
        <meshPhysicalMaterial
          color="#F8FAFC"
          transparent
          opacity={0.68}
          roughness={0.12}
          clearcoat={1.0}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[1.02, 0.39, -0.55]} scale={[1.3, 0.55, 0.48]} castShadow>
        <sphereGeometry args={[0.33, 20, 14]} />
        <meshPhysicalMaterial
          color="#F8FAFC"
          transparent
          opacity={0.68}
          roughness={0.12}
          clearcoat={1.0}
          depthWrite={false}
        />
      </mesh>

      {/* ── Teardrop Dark Smoked Glass Fastback Cabin Canopy ── */}
      <mesh position={[0, 0.08, -0.51]}>
        <extrudeGeometry args={[canopyShape, canopyExtrudeSettings]} />
        <meshPhysicalMaterial
          color="#0F172A"
          transparent
          opacity={0.78}
          roughness={0.05}
          metalness={0.15}
          transmission={0.22}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          ior={1.52}
          depthWrite={false}
        />
      </mesh>

      {/* ── Front Aerodynamic Splitter & Rear Diffuser ── */}
      <mesh position={[0, 0.04, -0.68]} castShadow>
        <extrudeGeometry args={[splitterShape, splitterSettings]} />
        <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.04, -0.66]} castShadow>
        <extrudeGeometry args={[diffuserShape, diffuserSettings]} />
        <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.25} />
      </mesh>

      {/* ── Matte Charcoal Side Skirts ── */}
      <mesh position={[0, 0.04, 0.67]} castShadow>
        <extrudeGeometry args={[skirtShape, skirtSettings]} />
        <meshStandardMaterial color="#334155" roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.04, -0.73]} castShadow>
        <extrudeGeometry args={[skirtShape, skirtSettings]} />
        <meshStandardMaterial color="#334155" roughness={0.42} metalness={0.22} />
      </mesh>

      {/* ── Recessed Front Air-Curtain Intakes & Signature 4-Point Ice-Blue LED DRLs ── */}
      {[0.46, -0.46].map((zSide, sideIdx) => (
        <group key={`headlight-${sideIdx}`} position={[1.60, 0.44, zSide]}>
          {/* Dark recessed vertical air curtain pocket */}
          <mesh position={[-0.02, -0.05, 0]}>
            <boxGeometry args={[0.05, 0.17, 0.16]} />
            <meshStandardMaterial color="#0F172A" roughness={0.5} metalness={0.2} />
          </mesh>
          {/* 4-point quad LED cluster */}
          {drlQuadOffsets.map(([dz, dy], ptIdx) => (
            <mesh
              key={ptIdx}
              ref={(el) => (drlRefs.current[sideIdx * 4 + ptIdx] = el)}
              position={[0.02, dy, dz]}
            >
              <boxGeometry args={[0.03, 0.022, 0.032]} />
              <meshStandardMaterial
                color="#E0F2FE"
                emissive="#38BDF8"
                emissiveIntensity={1.0}
                roughness={0.08}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Full-Width Crimson Rear LED Light Bar Across Decklid ── */}
      <mesh position={[-1.63, 0.56, 0]}>
        <boxGeometry args={[0.036, 0.036, 1.24]} />
        <meshStandardMaterial
          color="#FECACA"
          emissive="#EF4444"
          emissiveIntensity={0.95}
          roughness={0.08}
        />
      </mesh>

      {/* ── Sculpted Aerodynamic Side Mirrors ── */}
      <mesh position={[0.42, 0.72, 0.67]} rotation={[0, -0.18, 0]} castShadow>
        <boxGeometry args={[0.14, 0.055, 0.12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0.42, 0.72, -0.67]} rotation={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.14, 0.055, 0.12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.35} metalness={0.3} />
      </mesh>

      {/* ── 4 Mission-E Two-Tone Aero Turbine Wheels inside Dark Wheel Wells ── */}
      {wheelPositions.map((pos, idx) => {
        const outerSign = pos[2] > 0 ? 1 : -1;
        return (
          <group key={`wheel-${idx}`} position={pos}>
            {/* Dark recessed inner wheel-well liner */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, -outerSign * 0.05]}>
              <cylinderGeometry args={[0.32, 0.32, 0.24, 28]} />
              <meshStandardMaterial color="#0F172A" roughness={0.88} metalness={0.05} />
            </mesh>

            {/* Low-profile performance tire */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.28, 0.19, 32]} />
              <meshStandardMaterial color="#111827" roughness={0.72} metalness={0.08} />
            </mesh>

            {/* Outer satin-silver Mission-E alloy lip */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, outerSign * 0.085]}>
              <torusGeometry args={[0.215, 0.022, 10, 32]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.88} roughness={0.16} />
            </mesh>

            {/* Inner dark gloss wheel barrel */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.20, 0.20, 0.195, 24]} />
              <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.35} />
            </mesh>

            {/* Vented steel brake disc */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, outerSign * 0.068]}>
              <cylinderGeometry args={[0.165, 0.165, 0.025, 28]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.78} roughness={0.32} />
            </mesh>

            {/* Performance yellow brake caliper */}
            <mesh position={[idx < 2 ? -0.10 : 0.10, 0.04, outerSign * 0.072]}>
              <boxGeometry args={[0.065, 0.085, 0.036]} />
              <meshStandardMaterial
                color="#FACC15"
                emissive="#EAB308"
                emissiveIntensity={0.25}
                roughness={0.25}
                metalness={0.45}
              />
            </mesh>

            {/* 5 sculpted two-tone Mission-E aero blades */}
            {[0, 72, 144, 216, 288].map((deg, si) => (
              <group
                key={si}
                rotation={[0, 0, (deg * Math.PI) / 180]}
                position={[0, 0, outerSign * 0.095]}
              >
                <mesh position={[0.105, 0, 0]}>
                  <boxGeometry args={[0.19, 0.036, 0.016]} />
                  <meshStandardMaterial color="#F1F5F9" metalness={0.86} roughness={0.18} />
                </mesh>
              </group>
            ))}

            {/* Center hub cap */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, outerSign * 0.092]}>
              <cylinderGeometry args={[0.055, 0.055, 0.024, 18]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.88} roughness={0.16} />
            </mesh>

            {/* Pulsing cyan charging ring */}
            {isCharging && (
              <mesh
                ref={(el) => (wheelRingRefs.current[idx] = el)}
                position={[0, 0, outerSign * 0.115]}
              >
                <torusGeometry args={[0.325, 0.02, 12, 36]} />
                <meshBasicMaterial color="#00F0FF" transparent opacity={0.72} />
              </mesh>
            )}
          </group>
        );
      })}
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
