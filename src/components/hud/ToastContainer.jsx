import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ToastContainer({ toasts }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-40 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const borderAccent = isError
            ? 'border-l-red-500'
            : isWarning
            ? 'border-l-amber-500'
            : 'border-l-emerald-500';
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border border-slate-200/80 border-l-4 ${borderAccent} bg-white/85 px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-lg backdrop-blur-xl`}
            >
              {isError ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              )}
              <span className="leading-snug">{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
