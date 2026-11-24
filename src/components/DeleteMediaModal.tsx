import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="delete-media-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 select-none pointer-events-auto"
        >
          {/* Dimmed backdrop */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/70 transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-media-title"
            className="relative w-full max-w-[340px] sm:max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/95 overflow-hidden text-left"
          >
            {/* Title & Message */}
            <div className="space-y-1.5 px-0.5">
              <h3 id="delete-media-title" className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-6 w-full">
              <button
                id="delete-media-btn-cancel"
                type="button"
                autoFocus
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
