import React from 'react';
import { EyeOff } from 'lucide-react';

interface PrivacyModeCardProps {
  privacyMode: boolean;
  handleTogglePrivacy: () => void;
}

export function PrivacyModeCard({
  privacyMode,
  handleTogglePrivacy
}: PrivacyModeCardProps) {
  return (
    <div className="p-4 bg-zinc-900/40 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <EyeOff size={18} className="text-zinc-300" />
          <h3 className="text-sm sm:text-base font-semibold text-white">Modo Privacidade</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Oculta o conteúdo ao alternar de aplicativo ou minimizar.
        </p>
      </div>

      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          role="switch"
          aria-label="Modo Privacidade"
          checked={privacyMode}
          onChange={handleTogglePrivacy}
          className="sr-only peer"
        />
        <div className="w-11 h-6 rounded-full bg-zinc-800 transition-colors duration-200 ease-out motion-reduce:transition-none peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400/60 peer-checked:bg-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-[transform,background-color,border-color] after:duration-200 after:ease-out motion-reduce:after:transition-none peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:bg-black"></div>
      </label>
    </div>
  );
}

export default PrivacyModeCard;
