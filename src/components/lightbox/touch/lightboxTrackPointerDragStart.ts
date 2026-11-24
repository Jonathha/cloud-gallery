import React from 'react';
import { LightboxTouchRefs } from './lightboxTouchSurfaceTypes';
import { transitionConfig } from './lightboxTouchAnimate';

export function createTrackPointerDown(
  refs: LightboxTouchRefs,
  containerWidth: number,
  animateToBase: (targetX: number, customDuration?: number) => void
) {
  const { activePointerIdRef, isDraggingRef, isAnimatingRef, x, targetBaseXRef } = refs;

  return (e: React.PointerEvent) => {
    if (activePointerIdRef.current === null || (e.isPrimary && !isDraggingRef.current)) {
      activePointerIdRef.current = e.pointerId;
    }
    if (isAnimatingRef.current || Math.abs(x.get() - targetBaseXRef.current) > 1) {
      queueMicrotask(() => {
        if (!isDraggingRef.current && Math.abs(x.get() - targetBaseXRef.current) > 0.5) {
          const fullDist = containerWidth + 40;
          const remainingRatio = Math.min(1, Math.max(0.25, Math.abs(x.get() - targetBaseXRef.current) / fullDist));
          animateToBase(targetBaseXRef.current, transitionConfig.duration * remainingRatio);
        }
      });
    }
  };
}

export function createDragStart(refs: LightboxTouchRefs) {
  const { isDraggingRef, isAnimatingRef, activeAnimationRef } = refs;

  return () => {
    isDraggingRef.current = true;
    isAnimatingRef.current = false;
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop();
      activeAnimationRef.current = null;
    }
  };
}
