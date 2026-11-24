import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, FileText, HardDrive, Calendar, Clock, Film, Image as ImageIcon } from 'lucide-react';
import { DecryptedImage } from '../../types';

interface ImageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  image?: DecryptedImage | null;
  activeMediaUrl?: string | null;
}

export default function ImageDetailsModal({
  isOpen,
  onClose,
  image,
}: ImageDetailsModalProps) {
  if (!image) return null;

  const isVideo = image.isVideo || image.contentType?.startsWith('video/');
  const formattedDate = image.createdAt ? new Date(image.createdAt).toLocaleString('pt-BR') : 'Data desconhecida';
  const sizeFormatted = image.totalSize ? `${(image.totalSize / (1024 * 1024)).toFixed(2)} MB` : 'Tamanho desconhecido';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="image-details-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 select-none"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <div className="absolute inset-0 bg-black/70 transition-opacity" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[380px] sm:max-w-[420px] max-h-[90vh] bg-[#161618] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-y-auto text-left flex flex-col space-y-4 text-zinc-200 text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
                  {isVideo ? <Film size={16} /> : <ImageIcon size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Detalhes da Mídia</h3>
                  <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px]">ID: {image.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Info List */}
            <div className="space-y-3">
              <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <FileText size={13} className="text-blue-400" /> Tipo de Arquivo
                  </span>
                  <span className="font-mono text-white">{image.contentType || (isVideo ? 'video/webm' : 'image/jpeg')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <HardDrive size={13} className="text-emerald-400" /> Tamanho Total
                  </span>
                  <span className="font-mono text-white">{sizeFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-400" /> Data de Criação
                  </span>
                  <span className="font-mono text-white">{formattedDate}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 hover:text-white font-medium rounded-xl text-xs transition-colors cursor-pointer text-center"
            >
              Concluído
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
