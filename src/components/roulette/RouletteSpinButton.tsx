import React from 'react';
import { Dices } from 'lucide-react';

interface RouletteSpinButtonProps {
  isSpinning: boolean;
  spinsRemaining: number;
  onSpin: () => void;
}

export function RouletteSpinButton({
  isSpinning,
  spinsRemaining,
  onSpin,
}: RouletteSpinButtonProps) {
  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
      <button
        id="btn-spin-roulette"
        type="button"
        onClick={onSpin}
        disabled={isSpinning || spinsRemaining <= 0}
        className={`w-full sm:w-72 h-12 rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
          isSpinning
            ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-80'
            : spinsRemaining > 0
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black border border-amber-400 shadow-amber-500/20 active:scale-98'
            : 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'
        }`}
      >
        <Dices size={18} className={isSpinning ? 'animate-spin' : ''} />
        <span>
          {isSpinning
            ? 'Sorteando Prêmio...'
            : spinsRemaining > 0
            ? `Girar Roleta (${spinsRemaining} restantes)`
            : 'Sem Giros Restantes'}
        </span>
      </button>
    </div>
  );
}
