import { useRef, useEffect } from "react";

interface UseGalleryItemTouchProps {
  imgId: string;
  isSelectionMode: boolean;
  setIsSelectionMode?: (mode: boolean) => void;
  setSelectedForDeletion?: (val: string[] | ((prev: string[]) => string[])) => void;
  onImageClick: (e: React.MouseEvent) => void;
}

const MOVEMENT_THRESHOLD = 8;

export function useGalleryItemTouch({
  imgId,
  isSelectionMode,
  setIsSelectionMode,
  setSelectedForDeletion,
  onImageClick,
}: UseGalleryItemTouchProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const hasMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });

  const clearLongPressTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

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

  const startPress = (x: number, y: number) => {
    clearLongPressTimer();
    isLongPressRef.current = false;
    hasMovedRef.current = false;
    suppressClickRef.current = false;
    startPointRef.current = { x, y };

    timerRef.current = setTimeout(() => {
      if (hasMovedRef.current) return;
      isLongPressRef.current = true;
      triggerLongPressSelection();
    }, 380);
  };

  const registerMovement = (x: number, y: number) => {
    const dx = Math.abs(x - startPointRef.current.x);
    const dy = Math.abs(y - startPointRef.current.y);

    if (dx > MOVEMENT_THRESHOLD || dy > MOVEMENT_THRESHOLD) {
      hasMovedRef.current = true;
      suppressClickRef.current = true;
      clearLongPressTimer();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startPress(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startPress(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons !== 1) return;
    registerMovement(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    clearLongPressTimer();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearLongPressTimer();

    if (isLongPressRef.current || hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (hasMovedRef.current) {
      suppressClickRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    registerMovement(touch.clientX, touch.clientY);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current || suppressClickRef.current || hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      isLongPressRef.current = false;
      suppressClickRef.current = false;
      hasMovedRef.current = false;
      return;
    }

    onImageClick(e);
  };

  useEffect(() => {
    return () => clearLongPressTimer();
  }, []);

  return {
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick,
    triggerLongPressSelection,
  };
}
