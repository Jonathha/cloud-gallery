import React from 'react';
import { Lock, Key } from 'lucide-react';

interface SettingsUnlockScreenProps {
  extraPassword: string | null;
  unlockPasswordInput: string;
  setUnlockPasswordInput: (val: string) => void;
  setIsSettingsUnlocked: (val: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function SettingsUnlockScreen({
  extraPassword,
  unlockPasswordInput,
  setUnlockPasswordInput,
  setIsSettingsUnlocked,
  showToast
}: SettingsUnlockScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white mb-2">
        <Lock size={32} />
      </div>
      <h3 className="text-xl font-semibold text-white text-center">Configurações Protegidas</h3>
      <p className="text-sm text-zinc-400 text-center max-w-xs">
        Digite sua senha extra atual para alterar a imagem ou a senha.
      </p>
      <div className="w-full max-w-xs space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
            <Key size={18} />
          </div>
          <input
            type="text"
            name="settings-unlock-input"
            id="settings-unlock-input"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            maxLength={15}
            value={unlockPasswordInput}
            onChange={(e) => setUnlockPasswordInput(e.target.value)}
            placeholder="Digite aqui"
            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>
        <button
          onClick={() => {
            if (extraPassword && unlockPasswordInput.trim() === extraPassword.trim()) {
              setIsSettingsUnlocked(true);
              setUnlockPasswordInput('');
            } else {
              showToast('Senha incorreta', 'error');
            }
          }}
          disabled={unlockPasswordInput.length === 0}
          className="w-full py-3 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Desbloquear
        </button>
      </div>
    </div>
  );
}
