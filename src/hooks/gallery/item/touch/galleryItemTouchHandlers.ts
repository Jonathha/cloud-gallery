import React from "react";
import { GalleryItemTouchRefs } from "./galleryItemTouchTypes";

export function createGalleryItemTouchHandlers(
  refs: GalleryItemTouchRefs,
  triggerLongPressSelection: () => void
) {
  const { timerRef, isLongPressRef, touchStartPos, touchMovedRef } = refs;

  const handleTouchStart = (e: React.TouchEvent) => {
    isLongPressRef.current = false;
    touchMovedRef.current = false;

    if (e.touches && e.touches[0]) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    timerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        isLongPressRef.current = true;
        triggerLongPressSelection();
      }
    }, 380);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (touchStartPos.current && e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 8 || dy > 8) {
        touchMovedRef.current = true;
      }
    }
  };

  return { handleTouchStart, handleTouchEnd, handleTouchMove };
}
