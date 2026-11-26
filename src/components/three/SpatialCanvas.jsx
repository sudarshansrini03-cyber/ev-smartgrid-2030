import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import ErrorBoundary from '../ErrorBoundary';
import StudioEnvironment from './StudioEnvironment';
import DashboardCityScene from './scenes/DashboardCityScene';
import VehicleTurntableScene from './scenes/VehicleTurntableScene';
import StationsMapScene from './scenes/StationsMapScene';
import ChargingBayScene from './scenes/ChargingBayScene';
import EnergyGridScene from './scenes/EnergyGridScene';
import BatteryCutawayScene from './scenes/BatteryCutawayScene';
import P2PBridgeScene from './scenes/P2PBridgeScene';

export default function SpatialCanvas({
  activeTab,
  customFocus,
  onCanvasCreated,
  stats,
  simPulseKey,
  selectedVehicle,
  selectedStationId,
  onSelectStation,
  chargingState,
  energyMetrics,
  energyRoutes,
  balanceRippleKey,
  batteryCells,
  selectedCell,
  hoveredCell,
  onHoverCell,
  onSelectCell,
  explodedBattery,
  optimizeAnimKey,
  p2pSceneProps,
}) {
  return (
    <ErrorBoundary>
      <div className="fixed inset-0 z-0 h-full w-full bg-[#F8FAFC]">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 12.5, 16.5], fov: 42, near: 0.1, far: 120 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={() => {
            if (onCanvasCreated) onCanvasCreated();
          }}
        >
          <Suspense fallback={null}>
            <StudioEnvironment activeTab={activeTab} customFocus={customFocus} />

            {activeTab === 'dashboard' && (
              <DashboardCityScene stats={stats} simPulseKey={simPulseKey} />
            )}

            {activeTab === 'vehicles' && (
              <VehicleTurntableScene vehicle={selectedVehicle} />
            )}

            {activeTab === 'stations' && (
              <StationsMapScene
                selectedStationId={selectedStationId}
                onSelectStation={onSelectStation}
              />
            )}

            {activeTab === 'charging' && (
              <ChargingBayScene
                currentSoC={chargingState.currentSoC}
                targetSoC={chargingState.targetSoC}
                isCharging={chargingState.isCharging}
                powerKw={chargingState.stationKw}
                stationName={chargingState.stationShortName}
              />
            )}

            {activeTab === 'energy' && (
              <EnergyGridScene
                energyMetrics={energyMetrics}
                routes={energyRoutes}
                balanceRippleKey={balanceRippleKey}
              />
            )}

            {activeTab === 'battery' && (
              <BatteryCutawayScene
                cells={batteryCells}
                selectedCell={selectedCell}
                hoveredCell={hoveredCell}
                onHoverCell={onHoverCell}
                onSelectCell={onSelectCell}
                exploded={explodedBattery}
                optimizeAnimKey={optimizeAnimKey}
              />
            )}

            {activeTab === 'sell-charge' && (
              <P2PBridgeScene
                seller={p2pSceneProps.seller}
                buyer={p2pSceneProps.buyer}
                energyKwh={p2pSceneProps.energyKwh}
                isCalculated={p2pSceneProps.isCalculated}
                transferPulseKey={p2pSceneProps.transferPulseKey}
              />
            )}
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}
