import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ExtraPasswordPromptProps {
  /**
   * Active state of the modal
   */
  isOpen: boolean;
  /**
   * Double-bound state variable for the password input field
   */
  extraPasswordInput: string;
  /**
   * Setter to update the double-bound password field
   */
  setExtraPasswordInput: (value: string) => void;
  /**
   * Action of closing/dismissing the dialog
   */
  onClose: () => void;
  /**
   * Action of submitting the filled password to verify of truth
   */
  onSubmit: () => void;
}

/**
 * ExtraPasswordPrompt component prompts the client to key in the encryption passkey
 * allocated as secondary security parameter for a sensitive media file.
 */
export default function ExtraPasswordPrompt({
  isOpen,
  extraPasswordInput,
  setExtraPasswordInput,
  onClose,
  onSubmit
}: ExtraPasswordPromptProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        id="extra-password-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        onKeyDown={handleKeyDown}
      >
        <motion.div
          id="extra-password-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm bg-zinc-900 rounded-[2rem] p-8 border border-white/10 shadow-2xl text-center space-y-6"
        >
          {/* Heading with descriptive warnings */}
          <div className="space-y-2 mt-4">
            <h2 className="text-xl font-light text-white tracking-tight">Conteúdo Protegido</h2>
            <p className="text-sm text-zinc-500">Credencial secundária necessária para visualização.</p>
          </div>

          {/* Password text input form */}
          <div className="space-y-4">
            <input
              id="extra-secure-input-field"
              type="text"
              name="extra-secure-input"
              style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              value={extraPasswordInput}
              onChange={(e) => setExtraPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Digite aqui"
              className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white text-center placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
            
            {/* Control buttons */}
            <div className="flex gap-2">
              <button
                id="extra-btn-cancel"
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                id="extra-btn-unlock"
                type="button"
                onClick={onSubmit}
                className="flex-1 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-all"
              >
                Desbloquear
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
