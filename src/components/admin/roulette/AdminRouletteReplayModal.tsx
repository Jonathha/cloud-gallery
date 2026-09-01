import React from 'react';
import { X, Play, RotateCcw, Sparkles } from 'lucide-react';
import { RouletteSpinRecord } from '../../../services/rouletteService';
import { WINNING_INDEX } from '../../roulette/utils/stripGenerator';
import { RouletteTrack } from '../../roulette/RouletteTrack';
import { REWARDS } from '../../../types/roulette';
import { useRouletteReplay } from './useRouletteReplay';

interface AdminRouletteReplayModalProps {
  spin: RouletteSpinRecord | null;
  onClose: () => void;
}

export function AdminRouletteReplayModal({ spin, onClose }: AdminRouletteReplayModalProps) {
  const {
    loading,
    stripItems,
    winningReward,
    translateX,
    transitionDuration,
    isSpinning,
    jitter,
    containerRef,
    playReplay,
  } = useRouletteReplay(spin);

  if (!spin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#0b0b0e] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Demonstração da Partida: <span className="font-mono text-zinc-400">{spin.id}</span></h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        <div className="text-xs text-zinc-400 flex flex-wrap gap-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
          <div><span className="text-zinc-500">Usuário:</span> <strong className="text-white">{spin.user_email || spin.user_id}</strong></div>
          <div><span className="text-zinc-500">Prêmio:</span> <strong className="text-amber-300">{spin.reward_label}</strong></div>
          <div><span className="text-zinc-500">Data:</span> <strong className="text-zinc-200">{new Date(spin.created_at).toLocaleString('pt-BR')}</strong></div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Carregando dados da demonstração...</div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <RouletteTrack
              containerRef={containerRef}
              stripItems={stripItems}
              winningReward={winningReward}
              isSpinning={isSpinning}
              translateX={translateX}
              transitionDuration={transitionDuration}
              winningIndex={WINNING_INDEX}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => {
                  const targetReward = REWARDS.find((r) => r.id === spin.reward_id) || REWARDS[0];
                  playReplay(stripItems, targetReward, jitter);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 disabled:opacity-50 cursor-pointer shadow transition-all"
              >
                {isSpinning ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} className="fill-black" />}
                <span>{isSpinning ? 'Reproduzindo...' : 'Replay Novamente'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
