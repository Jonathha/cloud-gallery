import React from 'react';
import { Clock } from 'lucide-react';
import { AutoLockPresetsGrid, PRESET_OPTIONS } from './AutoLockPresetsGrid';
import { AutoLockCustomForm } from './AutoLockCustomForm';

export { PRESET_OPTIONS };

interface AutoLockCardProps {
  autoLockTimer: string;
  handleSaveTimer: (val: string) => void;
  customMinutes: string;
  setCustomMinutes: (val: string) => void;
  handleCustomSubmit: (e: React.FormEvent) => void;
}

export function AutoLockCard({
  autoLockTimer,
  handleSaveTimer,
  customMinutes,
  setCustomMinutes,
  handleCustomSubmit
}: AutoLockCardProps) {
  return (
    <div className="p-4 sm:p-5 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-zinc-300" />
          <h3 className="text-sm sm:text-base font-semibold text-white">Bloqueio Automático</h3>
        </div>
        <p className="text-xs text-zinc-400">Tempo de inatividade antes de bloquear o cofre.</p>
      </div>

      <AutoLockPresetsGrid
        autoLockTimer={autoLockTimer}
        handleSaveTimer={handleSaveTimer}
        setCustomMinutes={setCustomMinutes}
      />

      <AutoLockCustomForm
        currentValue={autoLockTimer}
        customMinutes={customMinutes}
        setCustomMinutes={setCustomMinutes}
        handleCustomSubmit={handleCustomSubmit}
      />
    </div>
  );
}

export default AutoLockCard;
