import React from 'react';
import { ArrowLeft, Dices } from 'lucide-react';

interface RouletteHeaderProps {
  onBack: () => void;
  isSpinning: boolean;
  spinsRemaining: number;
}

export function RouletteHeader({
  onBack,
  isSpinning,
  spinsRemaining,
}: RouletteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          id="btn-roulette-back"
          type="button"
          onClick={onBack}
          disabled={isSpinning}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          title="Voltar para a Galeria"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Voltar para Galeria</span>
          <span className="sm:hidden">Voltar</span>
        </button>

        <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Dices size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Roleta de Prêmios
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Teste Local
              </span>
            </h1>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Gire para sortear prêmios simulados de Robux
            </p>
          </div>
        </div>
      </div>

      {/* Indicador de Giros Rápidos no Topo */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-400 hidden sm:inline">
          Giros:
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((slot) => {
            const isAvailable = slot <= spinsRemaining;
            return (
              <div
                key={slot}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  isAvailable
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'bg-zinc-900 text-zinc-600 border border-white/[0.05]'
                }`}
              >
                {slot}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
