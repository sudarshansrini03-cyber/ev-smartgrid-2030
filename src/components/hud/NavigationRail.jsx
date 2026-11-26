import React from 'react';
import {
  LayoutDashboard,
  Car,
  MapPin,
  Zap,
  Sun,
  BatteryCharging,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
} from 'lucide-react';
import { NAV_TABS } from '../../data/initialData';

const ICONS = {
  dashboard: LayoutDashboard,
  vehicles: Car,
  stations: MapPin,
  charging: Zap,
  energy: Sun,
  battery: BatteryCharging,
  'sell-charge': ArrowLeftRight,
};

export default function NavigationRail({
  activeTab,
  onSelectTab,
  hudCollapsed,
  onToggleHud,
  onResetCamera,
}) {
  return (
    <>
      {/* Top Floating Brand + Controls Pill */}
      <header className="pointer-events-none fixed left-4 right-4 top-4 z-20 flex items-center justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/75 px-3.5 py-2 shadow-lg backdrop-blur-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-emerald-500 text-white shadow-sm">
            <Zap className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-extrabold tracking-tight text-slate-900 sm:text-sm">
              EV SmartGrid 2030
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span>Spatial Control Center · Studio 3D</span>
            </div>
          </div>
        </div>

        {/* Desktop Floating Navigation Pills */}
        <nav className="pointer-events-auto hidden items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/75 p-1.5 shadow-lg backdrop-blur-xl lg:flex">
          {NAV_TABS.map((tab) => {
            const Icon = ICONS[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Studio Camera + HUD Collapse Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onResetCamera}
            title="Reset 3D Camera"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-xl transition hover:bg-white hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5 text-sky-600" />
            <span className="hidden sm:inline">Reset View</span>
          </button>

          <button
            onClick={onToggleHud}
            title={hudCollapsed ? 'Show HUD Panels' : 'Minimize HUD Panels'}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-xl transition hover:bg-white hover:text-slate-900"
          >
            {hudCollapsed ? (
              <>
                <PanelLeftOpen className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Show HUD</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Hide HUD</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Bottom Navigation Dock */}
      <nav className="pointer-events-auto fixed bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-lg backdrop-blur-xl lg:hidden">
        {NAV_TABS.map((tab) => {
          const Icon = ICONS[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition-all ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="whitespace-nowrap">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
