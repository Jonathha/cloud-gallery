import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteMediaModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Excluir arquivo?',
  message = 'Este arquivo será movido para a lixeira.',
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
}: DeleteMediaModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="delete-media-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex flex-col justify-end items-center p-3 sm:p-4 select-none pointer-events-auto"
        >
          {/* Dimmed backdrop */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm sm:max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/95 overflow-hidden text-left mb-2 sm:mb-4"
          >
            {/* Top drag handle indicator */}
            <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-3.5 opacity-60" />

            {/* Title & Message */}
            <div className="space-y-1 px-0.5">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-5 w-full">
              <button
                id="delete-media-btn-cancel"
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700/80 active:scale-[0.98] text-zinc-300 hover:text-white font-medium rounded-xl text-sm transition-all border border-white/5 cursor-pointer text-center"
              >
                {cancelText}
              </button>

              <button
                id="delete-media-btn-confirm"
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-rose-950/40 cursor-pointer text-center"
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
