import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Turnstile from "../Turnstile";

interface VaultUnlockCaptchaProps {
  showCaptcha: boolean;
  setShowCaptcha: (s: boolean) => void;
  captchaVerified: boolean;
  turnstileKey: number;
  handleRecaptchaChange: (token: string | null) => void;
  captchaStatus: "idle" | "error" | "success" | "verifying";
  captchaMsg: string;
}

export function VaultUnlockCaptcha({
  showCaptcha,
  setShowCaptcha,
  captchaVerified: _captchaVerified,
  turnstileKey,
  handleRecaptchaChange,
  captchaStatus,
  captchaMsg
}: VaultUnlockCaptchaProps) {
  return (
    <AnimatePresence>
      {showCaptcha && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 15 }}
            className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowCaptcha(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2 transition-colors rounded-full hover:bg-white/5"
            >
              <X size={18} />
            </button>

            <div className="space-y-2 text-center">
              <h3 className="text-xl font-light text-white tracking-tight">Verificação de Segurança</h3>
              <p className="text-zinc-500 text-xs sm:text-sm px-2">
                Para confirmar que você não é um robô, complete o desafio de segurança abaixo.
              </p>
            </div>

            <div className="flex justify-center items-center py-2 min-h-[94px]">
              <Turnstile
                key={turnstileKey}
                sitekey="0x4AAAAAADwFk_xfBTRfVhyq"
                onChange={handleRecaptchaChange}
                theme="dark"
              />
            </div>

            <div className="text-center min-h-[36px] flex items-center justify-center">
              {captchaMsg && (
                <p className={`text-xs font-medium px-3 py-1.5 rounded-xl border leading-relaxed transition-all ${
                  captchaStatus === "success" 
                    ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" 
                    : captchaStatus === "error" 
                    ? "text-red-300 bg-red-500/10 border-red-500/20" 
                    : captchaStatus === "verifying" 
                    ? "text-amber-300 bg-amber-500/10 border-amber-500/20" 
                    : "text-zinc-400 bg-zinc-900 border-zinc-800"
                }`}>
                  {captchaMsg}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
