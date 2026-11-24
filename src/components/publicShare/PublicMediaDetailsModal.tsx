import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X, Lock } from 'lucide-react';

interface PublicMediaDetailsModalProps {
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  mediaTypeLabel: string;
  allowDownload: boolean;
  shareData?: any;
  formatCreationDate: (ts?: number) => string;
}

export default function PublicMediaDetailsModal({
  isDetailsOpen,
  setIsDetailsOpen,
  mediaTypeLabel,
  allowDownload,
  shareData,
  formatCreationDate,
}: PublicMediaDetailsModalProps) {
  return (
    <AnimatePresence>
      {isDetailsOpen && (
        <div
          id="details-backdrop"
          onClick={() => setIsDetailsOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 select-none"
        >
          <motion.div
            id="details-modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#161618] border border-white/10 rounded-2xl p-5 shadow-2xl relative text-zinc-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Info size={15} />
                </div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Detalhes do Arquivo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Data Rows */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-zinc-900">
                <span className="text-zinc-500">Tipo de Mídia</span>
                <span className="font-medium text-zinc-200">{mediaTypeLabel}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-zinc-900">
                <span className="text-zinc-500">Criptografia</span>
                <span className="font-medium text-emerald-400 flex items-center gap-1">
                  <Lock size={12} /> AES-256-GCM (Ponta a Ponta)
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-zinc-900">
                <span className="text-zinc-500">Compartilhado em</span>
                <span className="font-medium text-zinc-200">
                  {formatCreationDate(shareData?.createdAt)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-zinc-900">
                <span className="text-zinc-500">Download</span>
                <span className={`font-medium ${allowDownload ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {allowDownload ? 'Permitido' : 'Bloqueado'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-zinc-500">Modo de Exibição</span>
                <span className="font-medium text-zinc-200">
                  {shareData?.options?.oneTimeView ? 'Visualização Única (1 min)' : 'Visualização Segura'}
                </span>
              </div>
            </div>

            {/* Footer Button */}
            <div className="mt-5 pt-3 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
