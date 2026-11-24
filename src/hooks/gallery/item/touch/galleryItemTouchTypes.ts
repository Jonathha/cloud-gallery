import React from "react";

export interface UseGalleryItemTouchProps {
  imgId: string;
  isSelectionMode: boolean;
  setIsSelectionMode?: (mode: boolean) => void;
  setSelectedForDeletion?: (val: string[] | ((prev: string[]) => string[])) => void;
  onImageClick: (e: React.MouseEvent) => void;
}

export interface GalleryItemTouchRefs {
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  isLongPressRef: React.MutableRefObject<boolean>;
  touchStartPos: React.MutableRefObject<{ x: number; y: number } | null>;
  touchMovedRef: React.MutableRefObject<boolean>;
  mouseDownPos: React.MutableRefObject<{ x: number; y: number } | null>;
}
