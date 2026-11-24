import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, ShieldAlert, X } from 'lucide-react';

interface ChatExternalLinkModalProps {
  pendingExternalUrl: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ChatExternalLinkModal({
  pendingExternalUrl,
  onClose,
  onConfirm,
}: ChatExternalLinkModalProps) {
  return (
    <AnimatePresence>
      {pendingExternalUrl && (
        <div
          id="external-link-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 shadow-2xl relative text-zinc-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ShieldAlert size={16} />
                </div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Link Externo
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message */}
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Você está saindo da Cloud Gallery para um destino externo:
            </p>

            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 mb-3 break-all font-mono text-xs text-zinc-200 select-all">
              {pendingExternalUrl}
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed mb-5">
              Certifique-se de que confia no endereço antes de continuar. Links externos podem conter conteúdo não verificado.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20"
              >
                <span>Acessar Link</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
