import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface VaultSetupExtraPasswordFieldsProps {
  extraPassword: string;
  setExtraPassword: (val: string) => void;
  confirmExtraPassword: string;
  setConfirmExtraPassword: (val: string) => void;
  showExtra: boolean;
  setShowExtra: (val: boolean) => void;
  showConfirmExtra: boolean;
  setShowConfirmExtra: (val: boolean) => void;
  loading: boolean;
}

export const VaultSetupExtraPasswordFields: React.FC<VaultSetupExtraPasswordFieldsProps> = ({
  extraPassword, setExtraPassword, confirmExtraPassword, setConfirmExtraPassword,
  showExtra, setShowExtra, showConfirmExtra, setShowConfirmExtra, loading
}) => {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">
      <div className="relative">
        <input type="text" name="setup-extra-1" style={{ WebkitTextSecurity: showExtra ? 'none' : 'disc' } as React.CSSProperties} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" maxLength={15} value={extraPassword} onChange={(e) => setExtraPassword(e.target.value)} disabled={loading} className="w-full bg-zinc-950 border border-teal-500/30 focus:border-teal-400 rounded-xl py-2.5 px-4 text-center text-base font-mono focus:outline-none text-white placeholder:text-zinc-600 placeholder:text-xs" placeholder="Senha Extra de Segurança (min 4, max 15)" />
        <button type="button" onClick={() => setShowExtra(!showExtra)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2 cursor-pointer">
          <span className="inline-flex transition-transform duration-150 ease-out active:scale-90">{showExtra ? <Eye size={16} /> : <EyeOff size={16} />}</span>
        </button>
      </div>

      <div className="relative">
        <input type="text" name="setup-extra-2" style={{ WebkitTextSecurity: showConfirmExtra ? 'none' : 'disc' } as React.CSSProperties} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" maxLength={15} value={confirmExtraPassword} onChange={(e) => setConfirmExtraPassword(e.target.value)} disabled={loading} className="w-full bg-zinc-950 border border-teal-500/30 focus:border-teal-400 rounded-xl py-2.5 px-4 text-center text-base font-mono focus:outline-none text-white placeholder:text-zinc-600 placeholder:text-xs" placeholder="Repita a Senha Extra" />
        <button type="button" onClick={() => setShowConfirmExtra(!showConfirmExtra)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2 cursor-pointer">
          <span className="inline-flex transition-transform duration-150 ease-out active:scale-90">{showConfirmExtra ? <Eye size={16} /> : <EyeOff size={16} />}</span>
        </button>
      </div>
    </motion.div>
  );
};
