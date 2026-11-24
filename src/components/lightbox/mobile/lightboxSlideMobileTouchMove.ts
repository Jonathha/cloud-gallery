import React from 'react';
import { LightboxMobileTouchRefs } from './lightboxSlideMobileTypes';

export function createMobileTouchMoveCapture(refs: LightboxMobileTouchRefs) {
  const { transformRef, touchStartPosRef, lastTapPosRef, touchMovedRef } = refs;

  return (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      touchMovedRef.current = true;
      lastTapPosRef.current = null;
      if (transformRef.current?.instance) {
        transformRef.current.instance.lastTap = null;
      }
    }
  };
}
