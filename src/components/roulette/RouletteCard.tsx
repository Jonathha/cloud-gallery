import React from 'react';
import { RewardItem } from '../../types/roulette';
import { RobuxIcon } from './RobuxIcon';

interface RouletteCardProps {
  reward: RewardItem;
  isWinner?: boolean;
}

export const RouletteCard = React.memo(function RouletteCard({
  reward,
  isWinner = false,
}: RouletteCardProps) {
  const getTierStyles = (tier: RewardItem['tier']) => {
    switch (tier) {
      case 'tier-4': // 600, 700
        return {
          border: isWinner ? 'border-amber-400 shadow-lg shadow-amber-500/20' : 'border-amber-500/30',
          bg: 'bg-gradient-to-b from-amber-500/10 via-zinc-900 to-black',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          iconColor: 'text-amber-400',
          accentBar: 'bg-amber-400',
        };
      case 'tier-3': // 400, 500
        return {
          border: isWinner ? 'border-purple-400 shadow-lg shadow-purple-500/20' : 'border-purple-500/30',
          bg: 'bg-gradient-to-b from-purple-500/10 via-zinc-900 to-black',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          iconColor: 'text-purple-400',
          accentBar: 'bg-purple-400',
        };
      case 'tier-2': // 100, 200, 300
        return {
          border: isWinner ? 'border-blue-400 shadow-lg shadow-blue-500/20' : 'border-blue-500/30',
          bg: 'bg-gradient-to-b from-blue-500/10 via-zinc-900 to-black',
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          iconColor: 'text-blue-400',
          accentBar: 'bg-blue-400',
        };
      case 'tier-1': // 10, 20, 30, 50
      default:
        return {
          border: isWinner ? 'border-zinc-300 shadow-lg shadow-white/10' : 'border-white/10',
          bg: 'bg-gradient-to-b from-white/[0.06] via-zinc-900 to-black',
          badgeBg: 'bg-zinc-800 text-zinc-300 border-white/10',
          iconColor: 'text-zinc-300',
          accentBar: 'bg-zinc-500',
        };
    }
  };

  const styles = getTierStyles(reward.tier);

  return (
    <div
      className={`relative shrink-0 w-[108px] sm:w-[128px] h-[140px] sm:h-[160px] rounded-xl border flex flex-col items-center justify-between p-3 select-none transition-all duration-300 ${styles.bg} ${styles.border} ${
        isWinner ? 'scale-105 z-10' : 'opacity-90'
      }`}
    >
      {/* Top tier indicator bar */}
      <div className={`w-10 h-1 rounded-full ${styles.accentBar} opacity-80`} />

      {/* Center Robux representation */}
      <div className="flex flex-col items-center justify-center my-auto gap-2">
        <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
          <RobuxIcon
            size={26}
            className={
              reward.tier === 'tier-4'
                ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                : reward.tier === 'tier-3'
                ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]'
                : reward.tier === 'tier-2'
                ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                : 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]'
            }
          />
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <RobuxIcon size={15} className="text-amber-400 shrink-0" />
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
              {reward.amount}
            </span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mt-1">
            Robux
          </span>
        </div>
      </div>

      {/* Bottom badge */}
      <div className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${styles.badgeBg}`}>
        {reward.amount >= 600 ? 'Lendário' : reward.amount >= 400 ? 'Épico' : reward.amount >= 100 ? 'Raro' : 'Comum'}
      </div>
    </div>
  );
});
