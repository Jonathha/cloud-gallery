import { useEffect } from 'react';
import { LightboxTouchRefs } from './lightboxTouchSurfaceTypes';

export function useLightboxWindowPointerGuard(
  refs: LightboxTouchRefs,
  animateToBase: (targetX: number, customDuration?: number) => void
) {
  const { activePointerIdRef, isDraggingRef, isAnimatingRef, x, targetBaseXRef } = refs;

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        if (isDraggingRef.current || isAnimatingRef.current || Math.abs(x.get() - targetBaseXRef.current) > 2) {
          e.stopImmediatePropagation();
        }
      }
    };

    const handleWindowPointerEnd = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        if (isDraggingRef.current || isAnimatingRef.current || Math.abs(x.get() - targetBaseXRef.current) > 2) {
          e.stopImmediatePropagation();
        }
        return;
      }
      if (e.pointerId === activePointerIdRef.current) {
        activePointerIdRef.current = null;
        queueMicrotask(() => {
          if (!isDraggingRef.current && !isAnimatingRef.current && Math.abs(x.get() - targetBaseXRef.current) > 0.5) {
            animateToBase(targetBaseXRef.current);
          }
        });
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { capture: true });
    window.addEventListener('pointerup', handleWindowPointerEnd, { capture: true });
    window.addEventListener('pointercancel', handleWindowPointerEnd, { capture: true });
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove, { capture: true });
      window.removeEventListener('pointerup', handleWindowPointerEnd, { capture: true });
      window.removeEventListener('pointercancel', handleWindowPointerEnd, { capture: true });
    };
  }, [x]);
}
