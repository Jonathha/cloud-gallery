import { useState, useEffect, useRef, useCallback } from 'react';
import { RewardItem } from '../../../types/roulette';
import { rouletteAudio } from '../../../utils/rouletteAudio';
import { generateStrip, reconstructStrip, WINNING_INDEX } from '../utils/stripGenerator';
import { calculateCardCenter } from '../utils/rouletteDimensions';
import { fetchRouletteStatus, executeRouletteSpin } from '../../../services/rouletteService';
import { authPrimary } from '../../../firebase';

export function useRouletteAnimation() {
  const [spinsRemaining, setSpinsRemaining] = useState<number>(3);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [stripItems, setStripItems] = useState<RewardItem[]>([]);
  const [winningReward, setWinningReward] = useState<RewardItem | null>(null);
  const [translateX, setTranslateX] = useState<number>(0);
  const [transitionDuration, setTransitionDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consulta o saldo autoritativo do D1 ao inicializar e quando a sessão estiver ativa
  useEffect(() => {
    const checkStatus = () => {
      fetchRouletteStatus()
        .then((res) => {
          if (res?.success && typeof res.spinsRemaining === 'number') setSpinsRemaining(res.spinsRemaining);
        })
        .catch((e) => console.warn('[Roulette] Error fetching status:', e));
    };
    const unsubscribe = authPrimary.onAuthStateChanged((user) => { if (user) checkStatus(); });
    checkStatus();
    return () => unsubscribe();
  }, []);

  // Inicializa a esteira e centraliza em um card inicial
  useEffect(() => {
    setStripItems(generateStrip());
    setWinningReward(null);
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const initialX = containerRef.current.clientWidth / 2 - calculateCardCenter(4);
      setTransitionDuration(0);
      setTranslateX(initialX);
    }, 50);
    return () => {
      clearTimeout(timer);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      rouletteAudio.stopSpinSound();
    };
  }, []);

  // Giro validado e sorteado no Cloudflare Worker + D1 (Animação imediata no clique)
  const handleSpin = useCallback(async () => {
    if (isSpinning || spinsRemaining <= 0 || !containerRef.current) return;
    setIsSpinning(true);
    setErrorMessage(null);
    setWinningReward(null);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);

    const containerWidth = containerRef.current.clientWidth;
    const initialX = containerWidth / 2 - calculateCardCenter(4);
    const approxWinningCenter = calculateCardCenter(WINNING_INDEX);
    const prelimTargetX = containerWidth / 2 - approxWinningCenter;

    // Reseta instantaneamente a esteira para o ponto inicial (initialX) com duração 0
    setTransitionDuration(0);
    setTranslateX(initialX);

    // Dispara som e movimento visual da esteira após o frame de reset ser renderizado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rouletteAudio.playSpinSound();
        setTransitionDuration(5.5);
        setTranslateX(prelimTargetX);
      });
    });

    try {
      const res = await executeRouletteSpin();
      if (!res.success || !res.reward || !res.stripItemIds) {
        rouletteAudio.stopSpinSound();
        setTransitionDuration(0.3);
        setTranslateX(initialX);
        setIsSpinning(false);
        if (typeof res.spinsRemaining === 'number') setSpinsRemaining(res.spinsRemaining);
        setErrorMessage(res.error || 'Erro ao girar a roleta');
        return;
      }

      setStripItems(reconstructStrip(res.stripItemIds));
      const winningCenter = calculateCardCenter(WINNING_INDEX);
      const jitter = typeof res.jitter === 'number' ? res.jitter : 0;
      const exactTargetX = containerWidth / 2 - winningCenter + jitter;

      // Converge suavemente para o resultado exato retornado pelo servidor
      setTransitionDuration(5);
      setTranslateX(exactTargetX);

      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = setTimeout(() => {
        setIsSpinning(false);
        setWinningReward(res.reward || null);
        if (typeof res.spinsRemaining === 'number') setSpinsRemaining(res.spinsRemaining);
        else setSpinsRemaining((prev) => Math.max(0, prev - 1));
      }, 5000);
    } catch (err: any) {
      rouletteAudio.stopSpinSound();
      setTransitionDuration(0.3);
      setTranslateX(initialX);
      setIsSpinning(false);
      setErrorMessage(err?.message || 'Falha na conexão com o servidor.');
    }
  }, [isSpinning, spinsRemaining]);

  const handleResetSession = useCallback(() => {
    if (isSpinning) return;
    setWinningReward(null);
    setErrorMessage(null);
  }, [isSpinning]);

  return {
    spinsRemaining,
    isSpinning,
    stripItems,
    winningReward,
    translateX,
    transitionDuration,
    containerRef,
    winningIndex: WINNING_INDEX,
    errorMessage,
    handleSpin,
    handleResetSession,
  };
}
