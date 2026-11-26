import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';

export const CAMERA_PRESETS = {
  dashboard: { position: [0, 12.8, 17.5], target: [0, 0.2, 0.2] },
  vehicles: { position: [4.6, 2.55, 5.8], target: [0, 0.55, 0] },
  stations: { position: [1.2, 11.8, 15.2], target: [0, 0.4, 0] },
  charging: { position: [4.8, 3.2, 6.4], target: [0.1, 0.65, 0] },
  energy: { position: [0.4, 9.2, 13.6], target: [0, 0.7, 0] },
  battery: { position: [5.0, 4.6, 7.0], target: [0, 0.85, 0] },
  'sell-charge': { position: [0, 4.7, 13.2], target: [0, 0.7, 0] },
};

export function CameraRig({ activeTab, customFocus }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.dashboard.position));
  const desiredTarget = useRef(new THREE.Vector3(...CAMERA_PRESETS.dashboard.target));
  const isTransitioning = useRef(true);

  useEffect(() => {
    const preset = customFocus || CAMERA_PRESETS[activeTab] || CAMERA_PRESETS.dashboard;
    desiredPos.current.set(...preset.position);
    desiredTarget.current.set(...preset.target);
    isTransitioning.current = true;
  }, [activeTab, customFocus]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    if (isTransitioning.current) {
      const step = 1 - Math.exp(-4.2 * Math.min(delta, 0.05));
      camera.position.lerp(desiredPos.current, step);
      controlsRef.current.target.lerp(desiredTarget.current, step);
      controlsRef.current.update();

      if (
        camera.position.distanceTo(desiredPos.current) < 0.04 &&
        controlsRef.current.target.distanceTo(desiredTarget.current) < 0.04
      ) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={3}
      maxDistance={32}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2 - 0.05}
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
}

export default function StudioEnvironment({ activeTab, customFocus }) {
  return (
    <>
      <color attach="background" args={['#F8FAFC']} />
      <fog attach="fog" args={['#F8FAFC', 26, 62]} />

      {/* Bright daylight studio lighting */}
      <hemisphereLight args={['#FFFFFF', '#E2E8F0', 0.95]} />
      <directionalLight
        position={[14, 22, 12]}
        intensity={1.35}
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-14, 10, -10]} intensity={0.45} color="#E0F2FE" />
      <directionalLight position={[0, 8, -15]} intensity={0.35} color="#FEF3C7" />

      {/* Procedural Studio HDRI via Lightformers (zero external network fetches) */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#F8FAFC']} />
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#FFFFFF"
          position={[0, 10, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[18, 18, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#E0F2FE"
          position={[-10, 4, 6]}
          rotation={[0, Math.PI / 3, 0]}
          scale={[12, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.0}
          color="#FEF9C3"
          position={[10, 5, -4]}
          rotation={[0, -Math.PI / 2.5, 0]}
          scale={[10, 5, 1]}
        />
        <Lightformer
          form="ring"
          intensity={0.9}
          color="#FFFFFF"
          position={[0, 6, 10]}
          scale={[8, 8, 1]}
        />
      </Environment>

      {/* Clean matte-white architectural floor + faint hairline grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} metalness={0.0} />
      </mesh>
      <gridHelper args={[64, 64, '#E2E8F0', '#EEF2F6']} position={[0, -0.01, 0]} />

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.28}
        scale={28}
        blur={2.1}
        far={10}
        resolution={512}
        color="#64748B"
      />

      <CameraRig activeTab={activeTab} customFocus={customFocus} />
    </>
  );
}
