import React from "react";
import { GalleryItemTouchRefs } from "./galleryItemTouchTypes";

export function createGalleryItemMouseClickHandlers(
  refs: GalleryItemTouchRefs,
  triggerLongPressSelection: () => void,
  onImageClick: (e: React.MouseEvent) => void
) {
  const { timerRef, isLongPressRef, touchMovedRef, mouseDownPos } = refs;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isLongPressRef.current = false;
    touchMovedRef.current = false;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };

    timerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        isLongPressRef.current = true;
        triggerLongPressSelection();
      }
    }, 380);
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (e && mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx > 8 || dy > 8) {
        touchMovedRef.current = true;
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (touchMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      touchMovedRef.current = false;
      return;
    }

    if (isLongPressRef.current) {
      e.stopPropagation();
      e.preventDefault();
      isLongPressRef.current = false;
      return;
    }
    onImageClick(e);
  };

  return { handleMouseDown, handleMouseUp, handleClick };
}
