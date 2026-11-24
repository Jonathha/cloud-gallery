import React from 'react';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { VaultEncryptionMode } from './types';

interface VaultSetupModeOptionProps {
  mode: VaultEncryptionMode;
  setMode: (mode: VaultEncryptionMode) => void;
}

export const VaultSetupModeOption: React.FC<VaultSetupModeOptionProps> = ({ mode, setMode }) => {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      <button
        type="button"
        onClick={() => setMode('standard')}
        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
          mode === 'standard'
            ? 'bg-white/10 border-white text-white shadow-lg'
            : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
        }`}
      >
        <ShieldCheck size={20} className={mode === 'standard' ? 'text-emerald-400 shrink-0 mt-0.5' : 'shrink-0 mt-0.5 text-zinc-500'} />
        <div className="space-y-0.5 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Modo Padrão (Normal)</span>
            {mode === 'standard' && <CheckCircle2 size={16} className="text-white shrink-0" />}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Criptografia automática usando apenas a Senha Mestre. Acesso direto ao cofre sem exigir senha secundária.
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setMode('custom_extra')}
        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
          mode === 'custom_extra'
            ? 'bg-white/10 border-white text-white shadow-lg'
            : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
        }`}
      >
        <Lock size={20} className={mode === 'custom_extra' ? 'text-teal-400 shrink-0 mt-0.5' : 'shrink-0 mt-0.5 text-zinc-500'} />
        <div className="space-y-0.5 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Modo Proteção Dupla (Com Senha Extra)</span>
            {mode === 'custom_extra' && <CheckCircle2 size={16} className="text-white shrink-0" />}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Exige uma Senha Extra dedicada para fotos/mídias ocultas e ações de máxima segurança.
          </p>
        </div>
      </button>
    </div>
  );
};
