import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="confirm-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 select-none"
        >
          {/* Dimmed backdrop */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/80 transition-opacity"
          />

          {/* Modern Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[340px] sm:max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/95 overflow-hidden text-left"
          >
            <div className="space-y-1.5 px-0.5">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                {title}
              </h3>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-6 w-full">
              <button
                id="confirm-modal-btn-cancel"
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700/80 active:scale-[0.98] text-zinc-300 hover:text-white font-medium rounded-xl text-sm transition-all border border-white/5 cursor-pointer text-center"
              >
                {cancelText}
              </button>

              <button
                id="confirm-modal-btn-confirm"
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-2.5 px-4 font-semibold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer text-center shadow-md ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                    : 'bg-white hover:bg-zinc-200 text-black shadow-zinc-950/40'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


