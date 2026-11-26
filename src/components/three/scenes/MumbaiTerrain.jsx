import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

/**
 * Architectural scale-model terrain of Mumbai Metro Zone:
 * - Pale ice-blue coastal water contours (#E0F2FE)
 * - Extruded satin-white peninsula & Powai lake contour
 * - InstancedMesh minimalist city blocks (~88 buildings)
 */
export default function MumbaiTerrain({ showTraffic = false }) {
  const buildingsRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Extruded Mumbai Peninsula base shape
  const peninsulaGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-8.2, -5.8);
    s.lineTo(8.5, -5.8);
    s.quadraticCurveTo(9.2, -1.5, 8.2, 3.2);
    s.quadraticCurveTo(6.2, 5.4, 2.5, 5.8);
    s.quadraticCurveTo(-1.2, 6.2, -3.4, 5.4);
    s.quadraticCurveTo(-4.8, 3.8, -4.4, 1.8);
    s.quadraticCurveTo(-5.8, 0.4, -7.2, -1.8);
    s.quadraticCurveTo(-8.4, -3.8, -8.2, -5.8);
    s.closePath();

    const geom = new THREE.ExtrudeGeometry(s, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, []);

  // Deterministic architectural city blocks avoiding hub coordinates
  const blocks = useMemo(() => {
    const items = [];
    const forbidden = [
      [-5.2, -2.6], // Station A
      [-0.8, 3.4],  // Station B
      [5.4, -1.8],  // Station C
      [6.4, 2.8],   // Solar Farm
      [-5.6, 2.4],  // Substation
    ];

    for (let i = 0; i < 96; i++) {
      const gx = ((i * 37) % 140) / 10 - 6.8;
      const gz = ((i * 53) % 100) / 10 - 4.8;

      // Keep on landmass roughly
      if (gx < -3.6 && gz > 1.6) continue;
      if (gx > 7.6 || gz > 4.8 || gz < -5.0) continue;

      const tooClose = forbidden.some(([fx, fz]) => Math.hypot(gx - fx, gz - fz) < 1.55);
      if (tooClose) continue;

      // Keep main road corridors clear
      if (Math.abs(gz - 0.5) < 0.48 || Math.abs(gx - 0.8) < 0.48) continue;

      const w = 0.34 + ((i * 17) % 5) * 0.09;
      const d = 0.34 + ((i * 23) % 5) * 0.09;
      const h = 0.28 + ((i * 29) % 12) * 0.14 + (Math.abs(gx) < 2 && gz > 1.5 ? 0.65 : 0);
      items.push({ x: gx, z: gz, w, d, h });
    }
    return items;
  }, []);

  useLayoutEffect(() => {
    if (!buildingsRef.current) return;
    blocks.forEach((b, i) => {
      dummy.position.set(b.x, 0.25 + b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      buildingsRef.current.setMatrixAt(i, dummy.matrix);
    });
    buildingsRef.current.instanceMatrix.needsUpdate = true;
  }, [blocks, dummy]);

  return (
    <group>
      {/* Pale Ice-Blue Coastal Water Contour Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[26, 20]} />
        <meshStandardMaterial color="#E0F2FE" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Architectural Frame Border */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[26.2, 0.04, 20.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.85} />
      </mesh>

      {/* Satin-white extruded Mumbai Metro landmass */}
      <mesh geometry={peninsulaGeometry} position={[0, 0.03, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#FFFFFF" roughness={0.78} metalness={0.02} />
      </mesh>

      {/* Powai Lake pale ice-blue inlet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.8, 0.285, -2.5]}>
        <circleGeometry args={[1.05, 28]} />
        <meshStandardMaterial color="#E0F2FE" roughness={0.35} />
      </mesh>

      {/* Clean arterial road lines */}
      <mesh position={[0.4, 0.278, 0.5]} receiveShadow>
        <boxGeometry args={[13.6, 0.015, 0.34]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>
      <mesh position={[0.8, 0.278, 0]} receiveShadow>
        <boxGeometry args={[0.34, 0.015, 9.6]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>

      {/* InstancedMesh City Blocks */}
      <instancedMesh ref={buildingsRef} args={[null, null, blocks.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.65} metalness={0.06} />
      </instancedMesh>

      {/* Optional subtle coastal outline */}
      {showTraffic && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[12.8, 12.95, 64]} />
          <meshBasicMaterial color="#BAE6FD" transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
}
