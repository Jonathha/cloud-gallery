import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface ProtectImageModalProps {
  imageToProtect: string | null;
  setImageToProtect: (id: string | null) => void;
}

export default function ProtectImageModal({
  imageToProtect,
  setImageToProtect,
}: ProtectImageModalProps) {
  return (
    <AnimatePresence>
      {imageToProtect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-[#0a0a0a] rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-2">
              Proteger Imagem?
            </h3>
            <p className="text-zinc-400 text-sm mb-6">
              Deseja mover esta imagem para o cofre protegido? Ela passará a
              exigir a Senha Extra para ser visualizada.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setImageToProtect(null)}
                className="px-4 py-2 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const event = new CustomEvent("protect-image", {
                    detail: { id: imageToProtect },
                  });
                  window.dispatchEvent(event);
                  setImageToProtect(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition-colors text-sm"
              >
                Proteger
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
