import { useState, useRef, useCallback, useEffect } from 'react';
import { RewardItem, REWARDS } from '../../../types/roulette';
import { RouletteSpinRecord, fetchAdminRouletteSpinDetail } from '../../../services/rouletteService';
import { reconstructStrip, WINNING_INDEX } from '../../roulette/utils/stripGenerator';
import { calculateCardCenter } from '../../roulette/utils/rouletteDimensions';
import { rouletteAudio } from '../../../utils/rouletteAudio';

export function useRouletteReplay(spin: RouletteSpinRecord | null) {
  const [loading, setLoading] = useState<boolean>(true);
  const [stripItems, setStripItems] = useState<RewardItem[]>([]);
  const [winningReward, setWinningReward] = useState<RewardItem | null>(null);
  const [translateX, setTranslateX] = useState<number>(0);
  const [transitionDuration, setTransitionDuration] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [jitter, setJitter] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playReplay = useCallback((items: RewardItem[], reward: RewardItem, currentJitter: number) => {
    if (!containerRef.current) return;
    setIsSpinning(true);
    setWinningReward(null);
    setTransitionDuration(0);
    setTranslateX(containerRef.current.clientWidth / 2 - calculateCardCenter(2));
    rouletteAudio.playSpinSound();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetX = containerRef.current!.clientWidth / 2 - calculateCardCenter(WINNING_INDEX) + currentJitter;
        setTransitionDuration(5);
        setTranslateX(targetX);
        timeoutRef.current = setTimeout(() => {
          setIsSpinning(false);
          setWinningReward(reward);
        }, 5000);
      });
    });
  }, []);

  useEffect(() => {
    if (!spin) return;
    setLoading(true);
    fetchAdminRouletteSpinDetail(spin.id).then((detail) => {
      setLoading(false);
      if (!detail) return;
      let ids = detail.stripItemIds || [];
      if (ids.length === 0 && detail.strip_item_ids) {
        try { ids = JSON.parse(detail.strip_item_ids); } catch { ids = []; }
      }
      const items = reconstructStrip(ids);
      const reward = REWARDS.find((r) => r.id === detail.reward_id) || {
        id: detail.reward_id,
        amount: detail.reward_amount,
        label: detail.reward_label,
        tier: detail.reward_tier as any,
        weight: 1,
      };
      const j = typeof detail.jitter === 'number' ? detail.jitter : 0;
      setStripItems(items);
      setJitter(j);
      setTimeout(() => playReplay(items, reward, j), 200);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      rouletteAudio.stopSpinSound();
    };
  }, [spin, playReplay]);

  return {
    loading,
    stripItems,
    winningReward,
    translateX,
    transitionDuration,
    isSpinning,
    jitter,
    containerRef,
    playReplay,
  };
}
