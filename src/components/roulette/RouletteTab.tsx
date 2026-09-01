import React from 'react';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { useRouletteAnimation } from './hooks/useRouletteAnimation';
import { RouletteHeader } from './RouletteHeader';
import { RouletteTrack } from './RouletteTrack';
import { RouletteResult } from './RouletteResult';
import { RouletteSpinButton } from './RouletteSpinButton';

interface RouletteTabProps {
  onBack: () => void;
}

export function RouletteTab({ onBack }: RouletteTabProps) {
  const {
    spinsRemaining,
    isSpinning,
    stripItems,
    winningReward,
    translateX,
    transitionDuration,
    containerRef,
    winningIndex,
    errorMessage,
    handleSpin,
    handleResetSession,
  } = useRouletteAnimation();

  return (
    <div id="roulette-page" className="w-full h-full flex flex-col overflow-y-auto bg-[#050505] text-zinc-100 select-none">
      <RouletteHeader
        onBack={onBack}
        isSpinning={isSpinning}
        spinsRemaining={spinsRemaining}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full gap-6 sm:gap-8">
        <div className="w-full bg-[#0b0b0e] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center gap-6">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Giros Disponíveis: <span className="text-white font-bold">{spinsRemaining}/3</span>
              </span>
            </div>

            {spinsRemaining === 0 && !isSpinning && (
              <button
                type="button"
                onClick={handleResetSession}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg"
              >
                <RotateCcw size={13} />
                <span>Atualizar</span>
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <RouletteTrack
            containerRef={containerRef}
            stripItems={stripItems}
            winningReward={winningReward}
            isSpinning={isSpinning}
            translateX={translateX}
            transitionDuration={transitionDuration}
            winningIndex={winningIndex}
          />

          <RouletteResult
            winningReward={winningReward}
            isSpinning={isSpinning}
            spinsRemaining={spinsRemaining}
          />

          <RouletteSpinButton
            isSpinning={isSpinning}
            spinsRemaining={spinsRemaining}
            onSpin={handleSpin}
          />

          <p className="text-[11px] text-zinc-500 text-center max-w-lg leading-relaxed">
            * Este sistema é exclusivamente uma simulação visual para testes de interface. Não há cobrança, transações financeiras ou transferência real de Robux.
          </p>
        </div>
      </main>
    </div>
  );
}
