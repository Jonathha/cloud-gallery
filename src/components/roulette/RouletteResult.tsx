import React from 'react';
import { motion } from 'motion/react';
import { Award, Sparkles } from 'lucide-react';
import { RewardItem } from '../../types/roulette';
import { RobuxIcon } from './RobuxIcon';

interface RouletteResultProps {
  winningReward: RewardItem | null;
  isSpinning: boolean;
  spinsRemaining: number;
}

export function RouletteResult({
  winningReward,
  isSpinning,
  spinsRemaining,
}: RouletteResultProps) {
  return (
    <div className="min-h-[72px] flex items-center justify-center w-full">
      {winningReward && !isSpinning ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/20 to-amber-500/15 border border-amber-500/30 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider">
                Prêmio Conquistado!
              </p>
              <p className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Você ganhou</span>
                <span className="text-amber-300 flex items-center gap-1.5">
                  <RobuxIcon size={18} className="text-amber-400" />
                  {winningReward.amount} Robux
                </span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-amber-300/60 bg-black/40 px-2.5 py-1 rounded-md border border-amber-500/20">
            <Sparkles size={12} />
            <span>Simulação Local</span>
          </div>
        </motion.div>
      ) : spinsRemaining === 0 && !isSpinning ? (
        <div className="text-center py-2 text-xs text-zinc-500">
          Limite de 3 giros desta sessão de teste utilizado.
        </div>
      ) : null}
    </div>
  );
}
