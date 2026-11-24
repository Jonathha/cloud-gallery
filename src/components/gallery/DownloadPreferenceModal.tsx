import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Images, CloudDownload } from "lucide-react";

interface DownloadPreferenceModalProps {
  isOpen: boolean;
  cloudCount: number;
  onSelectFullDownload: () => void;
  onSelectThumbnailsOnly: () => void;
}

const EASE_OUT = [0.2, 0, 0, 1] as const;

export default function DownloadPreferenceModal({
  isOpen,
  cloudCount,
  onSelectFullDownload,
  onSelectThumbnailsOnly,
}: DownloadPreferenceModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="download-preference-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-preference-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/65"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.16, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
            style={{ willChange: "transform, opacity" }}
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)] text-zinc-100 font-sans"
          >
            <div className="space-y-2 text-center">
              <h3
                id="download-preference-title"
                className="text-base sm:text-lg font-semibold text-white tracking-tight"
              >
                Opções de Carregamento
              </h3>
              <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
                Identificamos {cloudCount} {cloudCount === 1 ? "mídia salva" : "mídias salvas"} na nuvem. Escolha como deseja carregá-las no seu dispositivo:
              </p>
            </div>

            <div className="space-y-2.5">
              <motion.button
                type="button"
                onClick={onSelectThumbnailsOnly}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.05 }}
                whileTap={{ scale: 0.975 }}
                className="w-full p-3.5 bg-zinc-800 hover:bg-zinc-700/80 border border-white/10 text-white rounded-2xl transition-colors duration-150 cursor-pointer text-left flex items-center gap-3 select-none touch-manipulation"
              >
                <span className="shrink-0 w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center text-zinc-200">
                  <Images size={19} />
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-xs sm:text-sm text-white">Carregar Apenas Miniaturas</span>
                  <span className="text-[11px] text-zinc-400 leading-tight">Mantenha a galeria rápida e leve, baixando os arquivos completos apenas ao abrir.</span>
                </span>
              </motion.button>

              <motion.button
                type="button"
                onClick={onSelectFullDownload}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.1 }}
                whileTap={{ scale: 0.975 }}
                className="w-full p-3.5 bg-white hover:bg-zinc-200 text-black rounded-2xl transition-colors duration-150 cursor-pointer text-left flex items-center gap-3 select-none touch-manipulation"
              >
                <span className="shrink-0 w-10 h-10 rounded-xl bg-black/[0.07] flex items-center justify-center text-zinc-800">
                  <CloudDownload size={19} />
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-bold text-xs sm:text-sm text-black">Baixar Tudo na Memória</span>
                  <span className="text-[11px] text-zinc-700 leading-tight">Carrega e armazena todos os arquivos completos na memória local para acesso imediato.</span>
                </span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
