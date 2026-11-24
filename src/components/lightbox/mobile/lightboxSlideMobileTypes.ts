import React from 'react';
import { DecryptedImage } from '../../../types';

export interface LightboxSlideMobileContentProps {
  img: DecryptedImage;
  isCurrent: boolean;
  selectedImage: string | null;
  downloadingFull: boolean;
  imageFit: 'contain' | 'cover';
  setImageFit?: (fit: 'contain' | 'cover') => void;
  isZoomed: boolean;
  setIsZoomed: (zoomed: boolean) => void;
  showControls: boolean;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  setIsShareOpen?: (open: boolean) => void;
  setIsPlaybackActive?: (active: boolean) => void;
}

export interface LightboxMobileTouchRefs {
  currentScaleRef: React.MutableRefObject<number>;
  transformRef: React.MutableRefObject<any>;
  touchStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  lastTapPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  touchMovedRef: React.MutableRefObject<boolean>;
}
