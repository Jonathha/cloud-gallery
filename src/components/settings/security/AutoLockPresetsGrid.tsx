import React from 'react';
import { Check } from 'lucide-react';

export const PRESET_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 h' },
  { value: 'never', label: 'Nunca' },
];

interface AutoLockPresetsGridProps {
  autoLockTimer: string;
  handleSaveTimer: (val: string) => void;
  setCustomMinutes: (val: string) => void;
}

export function AutoLockPresetsGrid({
  autoLockTimer,
  handleSaveTimer,
  setCustomMinutes,
}: AutoLockPresetsGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
      {PRESET_OPTIONS.map((preset) => {
        const active = autoLockTimer === preset.value;
        return (
          <button
            key={preset.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              setCustomMinutes('');
              // Já é o valor salvo: não grava nem avisa de novo
              if (!active) handleSaveTimer(preset.value);
            }}
            className={`py-2 px-2 rounded-xl text-xs font-semibold transition duration-150 motion-reduce:transition-none border flex items-center justify-center cursor-pointer active:scale-95 ${
              active
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border-white/10'
            }`}
          >
            {/* O ✓ abre espaço de forma gradual: o texto desliza em vez de pular */}
            <span
              aria-hidden="true"
              className={`inline-flex overflow-hidden transition-[width,margin,opacity] duration-200 ease-out motion-reduce:transition-none ${
                active ? 'w-3 mr-1 opacity-100' : 'w-0 mr-0 opacity-0'
              }`}
            >
              <Check size={12} strokeWidth={2.5} className="shrink-0" />
            </span>
            <span>{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AutoLockPresetsGrid;
