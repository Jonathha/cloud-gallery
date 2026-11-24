import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface VaultSetupPinSectionProps {
  pin: string;
  setPin: (val: string) => void;
  confirmPin: string;
  setConfirmPin: (val: string) => void;
  showPin: boolean;
  setShowPin: (val: boolean) => void;
  showConfirmPin: boolean;
  setShowConfirmPin: (val: boolean) => void;
  loading: boolean;
}

export const VaultSetupPinSection: React.FC<VaultSetupPinSectionProps> = ({
  pin, setPin, confirmPin, setConfirmPin,
  showPin, setShowPin, showConfirmPin, setShowConfirmPin, loading
}) => {
  return (
    <div className="space-y-3 bg-zinc-900/40 p-4 border border-white/5 rounded-2xl">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
        1. Senha Mestre do Cofre
      </h3>
      <div className="space-y-3">
        <div className="relative">
          <input type="text" name="setup-pin-1" style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' } as React.CSSProperties} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" value={pin} onChange={(e) => setPin(e.target.value)} disabled={loading} className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-center text-lg font-mono focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-600 placeholder:text-sm" placeholder="Senha Mestre (min 6 caracteres)" />
          <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2 cursor-pointer">
            <span className="inline-flex transition-transform duration-150 ease-out active:scale-90">{showPin ? <Eye size={18} /> : <EyeOff size={18} />}</span>
          </button>
        </div>
        <div className="relative">
          <input type="text" name="setup-pin-2" style={{ WebkitTextSecurity: showConfirmPin ? 'none' : 'disc' } as React.CSSProperties} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} disabled={loading} className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-center text-lg font-mono focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-600 placeholder:text-sm" placeholder="Repita a Senha Mestre" />
          <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2 cursor-pointer">
            <span className="inline-flex transition-transform duration-150 ease-out active:scale-90">{showConfirmPin ? <Eye size={18} /> : <EyeOff size={18} />}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
