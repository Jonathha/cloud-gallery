import React from 'react';
import { Lock, Key, Loader2 } from 'lucide-react';

interface CreateSecurityPasswordPromptProps {
  promptPassword: string;
  setPromptPassword: (val: string) => void;
  promptConfirmPassword: string;
  setPromptConfirmPassword: (val: string) => void;
  isSubmittingPrompt: boolean;
  setShowCreatePrompt: (show: boolean) => void;
  setPendingImageId: (id: string | null) => void;
  onSubmit: () => Promise<void>;
}

export function CreateSecurityPasswordPrompt({
  promptPassword,
  setPromptPassword,
  promptConfirmPassword,
  setPromptConfirmPassword,
  isSubmittingPrompt,
  setShowCreatePrompt,
  setPendingImageId,
  onSubmit
}: CreateSecurityPasswordPromptProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock size={24} />
          </div>
          <h4 className="text-lg font-bold text-white">Configurar Senha de Segurança</h4>
          <p className="text-xs text-zinc-400">
            Você ainda não tem uma senha de segurança configurada para as imagens protegidas. Crie uma agora para poder proteger esta foto.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs text-zinc-500 font-medium">Sua Nova Senha de Segurança (até 15 caracteres)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                <Key size={18} />
              </div>
              <input
                type="text"
                style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                maxLength={15}
                value={promptPassword}
                onChange={(e) => setPromptPassword(e.target.value)}
                placeholder="Digite a nova senha de segurança"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-zinc-500 font-medium">Confirmar Nova Senha de Segurança</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                <Key size={18} />
              </div>
              <input
                type="text"
                style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                maxLength={15}
                value={promptConfirmPassword}
                onChange={(e) => setPromptConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha de segurança"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowCreatePrompt(false);
              setPendingImageId(null);
            }}
            className="flex-1 py-3 bg-zinc-900 border border-white/10 text-white font-medium rounded-2xl hover:bg-zinc-800 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmittingPrompt || promptPassword.length === 0 || promptConfirmPassword.length === 0}
            onClick={onSubmit}
            className="flex-1 py-3 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {isSubmittingPrompt && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
