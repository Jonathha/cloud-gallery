import React from 'react';
import { LightboxMobileTouchRefs } from './lightboxSlideMobileTypes';

export function createMobileTouchStartCapture(refs: LightboxMobileTouchRefs) {
  const { transformRef, touchStartPosRef, lastTapPosRef, touchMovedRef } = refs;

  return (e: React.TouchEvent) => {
    const instance = transformRef.current?.instance;
    if (e.touches.length !== 1) {
      touchMovedRef.current = true;
      lastTapPosRef.current = null;
      if (instance) instance.lastTap = null;
      return;
    }
    const touch = e.touches[0];
    const prevTap = lastTapPosRef.current;
    const distFromLastTap = prevTap
      ? Math.hypot(touch.clientX - prevTap.x, touch.clientY - prevTap.y)
      : Infinity;

    if (touchMovedRef.current || distFromLastTap > 36) {
      if (instance) instance.lastTap = null;
    }

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchMovedRef.current = false;
  };
}
