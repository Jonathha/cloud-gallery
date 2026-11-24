import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

interface UnlinkPasswordModalProps {
  isOpen: boolean;
  isLoading: boolean;
  password: string;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function UnlinkPasswordModal({
  isOpen,
  isLoading,
  password,
  onPasswordChange,
  onClose,
  onConfirm,
}: UnlinkPasswordModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="unlink-password-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 select-none"
        >
          <div onClick={isLoading ? undefined : onClose} className="absolute inset-0 bg-black/80" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[340px] sm:max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/95 overflow-hidden text-left"
          >
            <div className="space-y-1.5 px-0.5">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                Desativar Acesso por Senha
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
                Informe sua senha atual para confirmar. Você continuará acessando sua conta através do Google.
              </p>
            </div>

            <div className="space-y-1 pt-4">
              <label className="text-xs font-semibold text-zinc-300">Senha atual</label>
              <input
                type="text"
                style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                autoComplete="current-password"
                autoFocus
                placeholder="Digite sua senha atual"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) onConfirm();
                }}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30 text-sm"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-6 w-full">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700/80 active:scale-[0.98] text-zinc-300 hover:text-white font-medium rounded-xl text-sm transition-all border border-white/5 cursor-pointer text-center disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading || !password}
                className="flex-1 py-2.5 px-4 font-semibold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer text-center shadow-md bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Desativando...
                  </>
                ) : (
                  "Desativar"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
