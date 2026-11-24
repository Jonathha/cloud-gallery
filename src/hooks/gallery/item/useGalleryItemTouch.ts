import { useRef, useEffect } from "react";
import {
  UseGalleryItemTouchProps,
  GalleryItemTouchRefs,
} from "./touch/galleryItemTouchTypes";
import { createTriggerLongPressSelection } from "./touch/galleryItemLongPress";
import { createGalleryItemTouchHandlers } from "./touch/galleryItemTouchHandlers";
import { createGalleryItemMouseClickHandlers } from "./touch/galleryItemMouseClickHandlers";

export function useGalleryItemTouch({
  imgId,
  setIsSelectionMode,
  setSelectedForDeletion,
  onImageClick,
}: UseGalleryItemTouchProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const refs: GalleryItemTouchRefs = {
    timerRef,
    isLongPressRef,
    touchStartPos,
    touchMovedRef,
    mouseDownPos,
  };

  const triggerLongPressSelection = createTriggerLongPressSelection({
    imgId,
    setIsSelectionMode,
    setSelectedForDeletion,
  });

  const { handleTouchStart, handleTouchEnd, handleTouchMove } =
    createGalleryItemTouchHandlers(refs, triggerLongPressSelection);

  const { handleMouseDown, handleMouseUp, handleClick } =
    createGalleryItemMouseClickHandlers(refs, triggerLongPressSelection, onImageClick);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleMouseDown,
    handleMouseUp,
    handleClick,
    triggerLongPressSelection,
  };
}
