import React from 'react';
import { animate, MotionValue } from 'motion/react';
import { DecryptedImage } from '../../../types';

export interface LightboxTouchSurfaceProps {
  images: DecryptedImage[];
  selectedImage: string | null;
  selectedImageId: string;
  selectedImageIsVideo: boolean;
  downloadingFull: boolean;
  fullDownloadProgress: string;
  imageFit: 'contain' | 'cover';
  setImageFit?: (fit: 'contain' | 'cover') => void;
  showControls: boolean;
  isZoomed: boolean;
  setIsZoomed: (zoomed: boolean) => void;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  setIsShareOpen?: (open: boolean) => void;
}

export interface LightboxTouchRefs {
  touchStartX: React.MutableRefObject<number | null>;
  touchStartY: React.MutableRefObject<number | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  lastValidIdRef: React.MutableRefObject<string>;
  lastIndex: React.MutableRefObject<number>;
  currentIndexRef: React.MutableRefObject<number>;
  targetBaseXRef: React.MutableRefObject<number>;
  isAnimatingRef: React.MutableRefObject<boolean>;
  isDraggingRef: React.MutableRefObject<boolean>;
  activePointerIdRef: React.MutableRefObject<number | null>;
  activeAnimationRef: React.MutableRefObject<ReturnType<typeof animate> | null>;
  x: MotionValue<number>;
}
