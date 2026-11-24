import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface TooltipState {
  text: string;
  targetRect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
}

const PADDING = 12; // Distância mínima absoluta de qualquer borda da tela
const GAP = 8; // Distância entre o botão/alvo e o tooltip

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(null);
  
  const currentTargetRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Recalcular posicionamento com base no tamanho REAL medido do tooltip
  useLayoutEffect(() => {
    if (!tooltip) {
      setCoords(null);
      return;
    }

    const calculatePosition = () => {
      const el = tooltipRef.current;
      const targetRect = tooltip.targetRect;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Largura e altura reais do tooltip ou estimativa segura mínima
      const tooltipWidth = el ? el.offsetWidth : 120;
      const tooltipHeight = el ? el.offsetHeight : 32;

      // 1. CÁLCULO DO EIXO X (Horizontal)
      // Centro do elemento alvo
      const targetCenterX = targetRect.left + targetRect.width / 2;
      // Posiciona o centro do tooltip no centro do alvo
      const idealLeft = targetCenterX - tooltipWidth / 2;
      // Clamping matemático estrito: nunca permite que o tooltip ultrapasse as bordas da tela
      const maxLeft = Math.max(PADDING, vw - tooltipWidth - PADDING);
      const clampedLeft = Math.max(PADDING, Math.min(idealLeft, maxLeft));

      // 2. CÁLCULO DO EIXO Y (Vertical)
      const spaceBelow = vh - (targetRect.bottom + GAP + tooltipHeight + PADDING);
      const spaceAbove = targetRect.top - GAP - tooltipHeight - PADDING;

      let placement: 'top' | 'bottom' = 'bottom';
      let idealTop: number;

      if (spaceBelow >= 0) {
        // Cabe perfeitamente abaixo
        placement = 'bottom';
        idealTop = targetRect.bottom + GAP;
      } else if (spaceAbove >= 0) {
        // Cabe perfeitamente acima
        placement = 'top';
        idealTop = targetRect.top - tooltipHeight - GAP;
      } else {
        // Se a tela for pequena, escolhe o lado com mais espaço disponível
        if (spaceBelow >= spaceAbove) {
          placement = 'bottom';
          idealTop = targetRect.bottom + GAP;
        } else {
          placement = 'top';
          idealTop = targetRect.top - tooltipHeight - GAP;
        }
      }

      // Clamping matemático estrito no eixo Y
      const maxTop = Math.max(PADDING, vh - tooltipHeight - PADDING);
      const clampedTop = Math.max(PADDING, Math.min(idealTop, maxTop));

      setCoords({
        x: Math.round(clampedLeft),
        y: Math.round(clampedTop),
        placement,
      });
    };

    calculatePosition();

    // Uma segunda checagem via requestAnimationFrame para garantir que a medição pós-render reflita o CSS exato
    const rafId = requestAnimationFrame(calculatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [tooltip]);

  useEffect(() => {
    // Verificação estrita para Desktop / PC com cursor
    const isPC = () => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    };

    const findTooltipTarget = (target: HTMLElement | null): { element: HTMLElement; text: string } | null => {
      let current: HTMLElement | null = target;
      while (current && current !== document.body) {
        // Se o elemento ou qualquer pai tiver opt-out explícito de tooltip
        if (current.hasAttribute('data-no-tooltip')) {
          return null;
        }

        // 1. data-tooltip explícito
        const dataTooltip = current.getAttribute('data-tooltip');
        if (dataTooltip && dataTooltip.trim()) {
          return { element: current, text: dataTooltip.trim() };
        }

        // 2. title nativo: migra para data-tooltip para suprimir o tooltip feio do navegador
        const title = current.getAttribute('title');
        if (title && title.trim()) {
          const text = title.trim();
          current.setAttribute('data-tooltip', text);
          current.removeAttribute('title');
          return { element: current, text };
        }

        current = current.parentElement;
      }
      return null;
    };

    const clearShowTimer = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const hide = () => {
      clearShowTimer();
      currentTargetRef.current = null;
      setTooltip(null);
      setCoords(null);
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (!isPC()) return;
      if ((e as any).pointerType === 'touch') return;

      const target = e.target as HTMLElement | null;
      const found = findTooltipTarget(target);

      if (!found) {
        if (currentTargetRef.current && !currentTargetRef.current.contains(target)) {
          hide();
        }
        return;
      }

      if (currentTargetRef.current === found.element) {
        return;
      }

      clearShowTimer();
      currentTargetRef.current = found.element;

      showTimerRef.current = setTimeout(() => {
        if (!currentTargetRef.current) return;
        const rect = currentTargetRef.current.getBoundingClientRect();

        // Se o elemento estiver oculto ou fora da tela
        if (rect.width === 0 && rect.height === 0) return;

        setTooltip({
          text: found.text,
          targetRect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          },
        });
      }, 100);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (currentTargetRef.current) {
        if (!related || !currentTargetRef.current.contains(related)) {
          hide();
        }
      }
    };

    const handleActionOrDismiss = () => {
      hide();
    };

    window.addEventListener('mouseover', handleMouseOver, true);
    window.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('mousedown', handleActionOrDismiss, true);
    window.addEventListener('click', handleActionOrDismiss, true);
    window.addEventListener('scroll', handleActionOrDismiss, { passive: true });
    window.addEventListener('resize', handleActionOrDismiss, { passive: true });

    return () => {
      clearShowTimer();
      window.removeEventListener('mouseover', handleMouseOver, true);
      window.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('mousedown', handleActionOrDismiss, true);
      window.removeEventListener('click', handleActionOrDismiss, true);
      window.removeEventListener('scroll', handleActionOrDismiss);
      window.removeEventListener('resize', handleActionOrDismiss);
    };
  }, []);

  if (!tooltip) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
        <motion.div
          ref={tooltipRef}
          key={tooltip.text}
          initial={{
            opacity: 0,
            scale: 0.94,
            y: coords?.placement === 'top' ? 4 : -4,
          }}
          animate={{
            opacity: coords ? 1 : 0,
            scale: coords ? 1 : 0.94,
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: coords ? `${coords.x}px` : `${tooltip.targetRect.left}px`,
            top: coords ? `${coords.y}px` : `${tooltip.targetRect.bottom + GAP}px`,
            visibility: coords ? 'visible' : 'hidden',
          }}
          className="bg-[#212121] text-white text-[13px] font-medium px-3.5 py-1.5 rounded-xl shadow-2xl border border-white/10 select-none whitespace-nowrap pointer-events-none flex items-center justify-center max-w-[calc(100vw-24px)] truncate"
        >
          {tooltip.text}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
