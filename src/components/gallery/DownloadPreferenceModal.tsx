import React from "react";
import { motion } from "framer-motion";

interface DownloadPreferenceModalProps {
  isOpen: boolean;
  cloudCount: number;
  onSelectFullDownload: () => void;
  onSelectThumbnailsOnly: () => void;
}

export default function DownloadPreferenceModal({
  isOpen,
  cloudCount,
  onSelectFullDownload,
  onSelectThumbnailsOnly,
}: DownloadPreferenceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-5 shadow-2xl text-zinc-100 font-sans"
      >
        <div className="space-y-1.5 text-center">
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Opções de Carregamento
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Identificamos {cloudCount} {cloudCount === 1 ? 'mídia salva' : 'mídias salvas'} na nuvem. Escolha como deseja carregá-las no seu dispositivo:
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onSelectThumbnailsOnly}
            className="w-full p-3.5 bg-zinc-800 hover:bg-zinc-700/80 border border-white/10 text-white rounded-xl transition-all cursor-pointer text-left flex flex-col gap-0.5 active:scale-[0.98]"
          >
            <span className="font-semibold text-xs sm:text-sm text-white">Carregar Apenas Miniaturas</span>
            <span className="text-[11px] text-zinc-400 leading-tight">Mantenha a galeria rápida e leve, baixando os arquivos completos apenas ao abrir.</span>
          </button>

          <button
            type="button"
            onClick={onSelectFullDownload}
            className="w-full p-3.5 bg-white hover:bg-zinc-200 text-black rounded-xl transition-all cursor-pointer text-left flex flex-col gap-0.5 active:scale-[0.98]"
          >
            <span className="font-bold text-xs sm:text-sm text-black">Baixar Tudo na Memória</span>
            <span className="text-[11px] text-zinc-700 leading-tight">Carrega e armazena todos os arquivos completos na memória local para acesso imediato.</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
