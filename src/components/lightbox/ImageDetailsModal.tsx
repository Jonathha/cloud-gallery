import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, HardDrive, ShieldCheck, X, FileImage, FileVideo, Info } from 'lucide-react';
import { DecryptedImage } from '../../types';

interface ImageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  image?: DecryptedImage | null;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Tamanho não especificado';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatVaultDate(timestamp?: any): { date: string; time: string } {
  if (!timestamp) return { date: 'Data não registrada', time: '--:--' };
  
  let ms = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  if (isNaN(ms) || ms <= 0) {
    return { date: 'Data não registrada', time: '--:--' };
  }

  // If timestamp was saved in seconds instead of ms (10 digits vs 13)
  if (ms < 10000000000) {
    ms = ms * 1000;
  }

  const d = new Date(ms);
  if (isNaN(d.getTime())) return { date: 'Data não registrada', time: '--:--' };

  const date = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const time = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return { date, time };
}

export default function ImageDetailsModal({
  isOpen,
  onClose,
  image,
}: ImageDetailsModalProps) {
  if (!image) return null;

  const isVideo = image.isVideo || image.contentType?.startsWith('video/') || false;
  const { date, time } = formatVaultDate(image.createdAt);
  const sizeFormatted = formatBytes(image.totalSize);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 select-none"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          {/* Dimmed & Blurred Overlay */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity" />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] sm:max-w-[380px] bg-[#1a1a1e] border border-white/10 rounded-[28px] p-5 sm:p-6 shadow-2xl shadow-black/90 overflow-hidden text-left"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>

            {/* Header Title */}
            <div className="flex items-center gap-3 pr-8">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shrink-0">
                {isVideo ? <FileVideo size={22} /> : <FileImage size={22} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                  Detalhes do Arquivo
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Informações salvas no cofre
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="mt-5 space-y-3">
              {/* Day / Date */}
              <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Calendar size={18} className="text-indigo-400 shrink-0" />
                  <span className="text-xs font-medium text-zinc-400">Data de Envio:</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white capitalize">
                  {date}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Clock size={18} className="text-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-zinc-400">Horário:</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white font-mono">
                  {time}
                </span>
              </div>

              {/* File Size */}
              <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3 text-zinc-300">
                  <HardDrive size={18} className="text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-zinc-400">Tamanho:</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white font-mono">
                  {sizeFormatted}
                </span>
              </div>

              {/* Vault Security Status */}
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <ShieldCheck size={18} className="shrink-0" />
                  <span className="text-xs font-semibold">Proteção do Cofre</span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  Ativa
                </span>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="mt-6 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-semibold rounded-2xl transition-all text-sm cursor-pointer shadow-lg active:scale-[0.98]"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
