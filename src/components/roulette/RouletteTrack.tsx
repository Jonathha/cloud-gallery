import React, { RefObject } from 'react';
import { RewardItem } from '../../types/roulette';
import { RouletteCard } from './RouletteCard';

interface RouletteTrackProps {
  containerRef: RefObject<HTMLDivElement>;
  stripItems: RewardItem[];
  winningReward: RewardItem | null;
  isSpinning: boolean;
  translateX: number;
  transitionDuration: number;
  winningIndex: number;
}

export function RouletteTrack({
  containerRef,
  stripItems,
  winningReward,
  isSpinning,
  translateX,
  transitionDuration,
  winningIndex,
}: RouletteTrackProps) {
  return (
    <div className="w-full relative py-4">
      {/* Indicador Central Superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
        <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
          <path
            d="M11 14L0 0H22L11 14Z"
            fill="#f59e0b"
            stroke="#fbbf24"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Linha Guia Vertical Central */}
      <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-0.5 bg-amber-400/30 z-20 pointer-events-none shadow-[0_0_8px_rgba(245,158,11,0.4)]" />

      {/* Indicador Central Inferior */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
        <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
          <path
            d="M11 0L22 14H0L11 0Z"
            fill="#f59e0b"
            stroke="#fbbf24"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Gradientes Laterais para suavizar entrada e saída */}
      <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#0b0b0e] via-[#0b0b0e]/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#0b0b0e] via-[#0b0b0e]/80 to-transparent z-20 pointer-events-none" />

      {/* Viewport da Esteira */}
      <div
        ref={containerRef}
        className="w-full h-[170px] sm:h-[190px] bg-[#070709] border border-white/[0.08] rounded-xl overflow-hidden flex items-center relative shadow-inner"
      >
        {/* Faixa Deslizante */}
        <div
          className="flex items-center gap-[10px] sm:gap-[12px] px-4 absolute top-1/2 -translate-y-1/2 will-change-transform"
          style={{
            transform: `translate3d(${translateX}px, 0, 0)`,
            transition:
              transitionDuration > 0
                ? `transform ${transitionDuration}s cubic-bezier(0.12, 0.8, 0.25, 1)`
                : 'none',
          }}
        >
          {stripItems.map((item, index) => {
            const isWinnerCard = winningReward && !isSpinning && index === winningIndex;
            return (
              <RouletteCard
                key={`${item.id}-${index}`}
                reward={item}
                isWinner={Boolean(isWinnerCard)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
