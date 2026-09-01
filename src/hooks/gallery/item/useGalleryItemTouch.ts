import { useRef, useEffect } from "react";

interface UseGalleryItemTouchProps {
  imgId: string;
  isSelectionMode: boolean;
  setIsSelectionMode?: (mode: boolean) => void;
  setSelectedForDeletion?: (val: string[] | ((prev: string[]) => string[])) => void;
  onImageClick: (e: React.MouseEvent) => void;
}

export function useGalleryItemTouch({
  imgId,
  isSelectionMode,
  setIsSelectionMode,
  setSelectedForDeletion,
  onImageClick,
}: UseGalleryItemTouchProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const triggerLongPressSelection = () => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (_) {}
    }
    if (setIsSelectionMode) {
      setIsSelectionMode(true);
    }
    if (setSelectedForDeletion) {
      setSelectedForDeletion((prev: string[]) => {
        if (prev.includes(imgId)) return prev;
        return [...prev, imgId];
      });
    }
  };

  const handleTouchStart = () => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerLongPressSelection();
    }, 380);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerLongPressSelection();
    }, 380);
  };

  const handleMouseUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
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

  const handleTouchMove = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.stopPropagation();
      e.preventDefault();
      isLongPressRef.current = false;
      return;
    }
    onImageClick(e);
  };

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
