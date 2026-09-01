import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  key?: string;
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    // Snappier automatic dismissal (1800ms instead of 3000ms)
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 260 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl border border-zinc-800/80 bg-zinc-900/95 text-zinc-100 w-[calc(100%-2rem)] sm:w-auto max-w-sm"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="shrink-0">
          {type === 'success' ? (
            <CheckCircle size={18} className="text-zinc-400" />
          ) : type === 'error' ? (
            <AlertCircle size={18} className="text-red-400" />
          ) : (
            <Info size={18} className="text-zinc-400" />
          )}
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-200">{message}</span>
      </div>
    </motion.div>
  );
}
