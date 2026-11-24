import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

interface PublicMediaToastProps {
  toastMessage: string | null;
}

export default function PublicMediaToast({ toastMessage }: PublicMediaToastProps) {
  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-20 inset-x-0 flex justify-center pointer-events-none z-50 px-4"
        >
          <div className="bg-zinc-900/90 border border-zinc-800 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
