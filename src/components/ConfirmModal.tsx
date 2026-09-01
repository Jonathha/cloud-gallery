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
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 select-none"
        >
          {/* Dimmed & Blurred Dark Backdrop Overlay */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
          />

          {/* Native App Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[340px] sm:max-w-[360px] bg-[#242427] border border-white/10 rounded-[28px] p-6 sm:p-7 shadow-2xl shadow-black/90 overflow-hidden text-left"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              {title}
            </h3>

            <p className="text-zinc-300 text-sm sm:text-[15px] leading-relaxed mt-3 font-normal">
              {message}
            </p>

            {/* Bottom-right Action Buttons */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 w-full pt-7">
              <button
                id="confirm-modal-btn-cancel"
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-transparent hover:bg-white/5 active:bg-white/10 text-zinc-300 hover:text-white font-semibold rounded-xl transition-all text-sm cursor-pointer"
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
                className={`px-4 py-2 bg-transparent hover:bg-white/5 active:bg-white/10 font-bold rounded-xl transition-all text-sm cursor-pointer ${
                  isDestructive ? 'text-rose-400 hover:text-rose-300' : 'text-white'
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

