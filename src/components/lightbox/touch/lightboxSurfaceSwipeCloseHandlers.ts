import React from 'react';
import { LightboxTouchRefs } from './lightboxTouchSurfaceTypes';

export function createSurfaceSwipeCloseHandlers(
  refs: LightboxTouchRefs,
  isZoomed: boolean,
  isPlaybackActive: boolean,
  onClose: () => void
) {
  const { touchStartX, touchStartY } = refs;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1 || isZoomed || isPlaybackActive) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || isZoomed || isPlaybackActive) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const distanceX = touchStartX.current - touchEndX;
    const distanceY = touchStartY.current - touchEndY;

    if (Math.abs(distanceY) > Math.abs(distanceX) && distanceY < -120) {
      onClose();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return { handleTouchStart, handleTouchEnd };
}
