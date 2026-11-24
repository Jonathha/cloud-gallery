import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { RefreshCw, Loader2, Film, Image as ImageIcon } from 'lucide-react';
import TrashIcon from '../icons/TrashIcon';

interface TrashActionOverlayProps {
  selectedImage: any;
  setSelectedImage: (img: any) => void;
  handleRestore: (img: any) => void;
  setIsConfirmDeleteOpen: (val: boolean) => void;
  isRestoring: boolean;
  isDeleting: boolean;
}

export default function TrashActionOverlay({
  selectedImage,
  setSelectedImage,
  handleRestore,
  setIsConfirmDeleteOpen,
  isRestoring,
  isDeleting,
}: TrashActionOverlayProps) {
  const reduce = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;
  return (
    <AnimatePresence>
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.16, ease }}
          style={{ willChange: 'opacity' }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 overscroll-contain"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 6, transition: { duration: reduce ? 0 : 0.12, ease: 'easeIn' } }}
            transition={{ duration: reduce ? 0 : 0.2, ease }}
            style={{ willChange: 'transform, opacity' }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain flex flex-col items-center gap-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border border-white/5 flex items-center justify-center">
              {selectedImage.noThumbnail || !selectedImage.url ? (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                  {selectedImage.isVideo ? (
                    <Film size={40} className="opacity-50" strokeWidth={1.5} />
                  ) : (
                    <ImageIcon size={40} className="opacity-50" strokeWidth={1.5} />
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-wider">
                    Prévia indisponível
                  </span>
                </div>
              ) : (
                <img
                  src={selectedImage.url}
                  className="w-full h-full object-contain"
                  alt="Pré-visualização do item"
                  decoding="async"
                  draggable={false}
                />
              )}
            </div>
            
            <div className="w-full space-y-3">
              <button
                onClick={() => handleRestore(selectedImage)}
                disabled={isRestoring || isDeleting}
                className="w-full py-3.5 sm:py-4 bg-white text-black font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 active:scale-[0.98] touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[background-color,transform] duration-150 disabled:opacity-50 text-sm sm:text-base"
              >
                {isRestoring ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                {selectedImage.isVideo ? 'Restaurar Vídeo' : 'Restaurar Imagem'}
              </button>
              
              <button
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={isRestoring || isDeleting}
                className="w-full py-3.5 sm:py-4 bg-red-500/10 text-red-500 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-[0.98] touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[background-color,transform] duration-150 border border-red-500/20 disabled:opacity-50 text-sm sm:text-base"
              >
                <TrashIcon size={20} />
                Excluir Permanentemente
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
