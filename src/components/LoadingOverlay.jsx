import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingOverlay({ canvasReady }) {
  const { active, progress } = useProgress();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), 450);
    return () => clearTimeout(timer);
  }, []);

  const isLoading = active || !canvasReady || !minElapsed;
  const displayPct = Math.min(100, Math.round(canvasReady ? Math.max(progress, 100) : Math.max(progress, 35)));

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F8FAFC]/95 backdrop-blur-md"
        >
          <div className="w-72 rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-slate-900">
              <span>EV SMARTGRID 2030</span>
              <span className="font-mono text-emerald-600">{displayPct}%</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 via-emerald-500 to-amber-500"
                initial={{ width: '15%' }}
                animate={{ width: `${displayPct}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2.5 text-[11px] font-medium text-slate-500">
              Initializing 3D architectural WebGL studio…
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
