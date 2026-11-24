import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { batchTrashProgressService, BatchTrashProgressState } from '../../services/batchTrashProgressService';

export default function BatchTrashProgressModal() {
  const [state, setState] = useState<BatchTrashProgressState>({
    isActive: false,
    isLagging: false,
    current: 0,
    total: 0,
    isComplete: false,
  });

  useEffect(() => {
    return batchTrashProgressService.subscribe(setState);
  }, []);

  const shouldShow = state.isActive && state.isLagging;
  const percentage = state.total > 0 ? Math.min(100, Math.round((state.current / state.total) * 100)) : 0;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key="batch-trash-top-modal"
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm sm:max-w-md pointer-events-auto select-none"
        >
          <div className="relative overflow-hidden bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col gap-2.5">
            {/* Ambient subtle glow */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-red-500/10 blur-2xl pointer-events-none rounded-full" />

            <div className="flex items-center gap-3 relative z-10">
              {/* Status Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  state.isComplete
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                }`}
              >
                {state.isComplete ? (
                  <CheckCircle2 size={18} className="animate-scaleIn" />
                ) : (
                  <Loader2 size={18} className="animate-spin text-red-400" />
                )}
              </div>

              {/* Title & Counter Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate">
                    {state.isComplete ? 'Mídias movidas para a lixeira' : 'Movendo para a lixeira...'}
                  </h4>
                  <span className="text-[11px] sm:text-xs font-mono font-medium text-zinc-400 shrink-0">
                    {percentage}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                  <span className="truncate">
                    {state.isComplete ? 'Concluído com sucesso' : 'Levando aos poucos para evitar travamentos'}
                  </span>
                  <span className="font-medium text-zinc-200 shrink-0 ml-2">
                    {state.current} de {state.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Fluid Progress Bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative z-10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ ease: 'easeOut', duration: 0.22 }}
                className={`h-full rounded-full transition-colors ${
                  state.isComplete
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-red-500 via-amber-500 to-emerald-400'
                }`}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
