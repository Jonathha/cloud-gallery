import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Loader2 } from 'lucide-react';

interface TrashDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isVideo?: boolean;
}

/**
 * Confirmação de exclusão permanente de um item individual da Lixeira.
 * Exclusivo da Lixeira — mantém a mesma base visual do DeleteMediaModal
 * sem alterá-lo, pois ele é compartilhado com outras telas.
 */
export default function TrashDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isVideo = false,
}: TrashDeleteConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Ao confirmar, o item selecionado é limpo; fixa o tipo de mídia para o texto
  // não mudar durante a animação de saída.
  const [lockedIsVideo, setLockedIsVideo] = useState(isVideo);
  const mediaIsVideo = isSubmitting ? lockedIsVideo : isVideo;

  useEffect(() => {
    if (!isOpen) return;
    submittingRef.current = false;
    setIsSubmitting(false);
    // Ação destrutiva: o foco inicial fica na opção segura.
    const id = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCancel = () => {
    if (submittingRef.current) return;
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // Fecha apenas este modal, sem acionar atalhos globais da galeria.
    e.stopPropagation();
    handleCancel();
  };

  const handleConfirm = () => {
    // Evita disparos duplicados enquanto o modal fecha.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLockedIsVideo(isVideo);
    setIsSubmitting(true);
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="trash-delete-confirm-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 select-none pointer-events-auto"
        >
          {/* Dimmed backdrop */}
          <div
            onClick={handleCancel}
            className="absolute inset-0 bg-black/80 transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            role="alertdialog"
            onKeyDown={handleKeyDown}
            aria-modal="true"
            aria-labelledby="trash-delete-confirm-title"
            aria-describedby="trash-delete-confirm-message"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[340px] sm:max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/95 overflow-hidden text-left"
          >
            {/* Icon + Title & Message */}
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div
                aria-hidden="true"
                className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400"
              >
                <Trash2 size={18} />
              </div>

              <div className="min-w-0 space-y-1.5 pt-0.5">
                <h3
                  id="trash-delete-confirm-title"
                  className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight"
                >
                  Excluir permanentemente?
                </h3>
                <p
                  id="trash-delete-confirm-message"
                  className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal"
                >
                  {mediaIsVideo ? 'Este vídeo será apagado' : 'Esta foto será apagada'} da lixeira e do armazenamento.{' '}
                  <span className="text-zinc-300 font-medium">Essa ação não pode ser desfeita.</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-6 w-full">
              <button
                ref={cancelRef}
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700/80 active:scale-[0.98] text-zinc-300 hover:text-white font-medium rounded-xl text-sm transition-all border border-white/5 cursor-pointer text-center outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-rose-950/40 cursor-pointer text-center outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:bg-rose-600 disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={16} aria-hidden="true" />
                )}
                {isSubmitting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
