import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trash2, Loader2 } from 'lucide-react';

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
  return (
    <AnimatePresence>
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center gap-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border border-white/5">
              <img src={selectedImage.url} className="w-full h-full object-contain" alt="Selected" />
            </div>
            
            <div className="w-full space-y-3">
              <button
                onClick={() => handleRestore(selectedImage)}
                disabled={isRestoring || isDeleting}
                className="w-full py-3.5 sm:py-4 bg-white text-black font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {isRestoring ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                Restaurar Imagem
              </button>
              
              <button
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={isRestoring || isDeleting}
                className="w-full py-3.5 sm:py-4 bg-red-500/10 text-red-500 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50 text-sm sm:text-base"
              >
                <Trash2 size={20} />
                Excluir Permanentemente
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
