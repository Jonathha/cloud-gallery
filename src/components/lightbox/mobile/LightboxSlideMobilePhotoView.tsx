import React from 'react';
import { TransformWrapper } from 'react-zoom-pan-pinch';
import { DecryptedImage } from '../../../types';
import { LightboxMobileTouchRefs } from './lightboxSlideMobileTypes';
import { createMobileTransformCallbacks } from './lightboxSlideMobileTransformCallbacks';
import { LightboxSlideMobileTransformContent } from './LightboxSlideMobileTransformContent';

interface LightboxSlideMobilePhotoViewProps {
  img: DecryptedImage;
  isCurrent: boolean;
  isZoomed: boolean;
  setIsZoomed: (zoomed: boolean) => void;
  imageFit: 'contain' | 'cover';
  thumbnailUrl: string;
  activeOriginalUrl: string | null;
  refs: LightboxMobileTouchRefs;
  onTouchStartCapture: (e: React.TouchEvent) => void;
  onTouchMoveCapture: (e: React.TouchEvent) => void;
}

export function LightboxSlideMobilePhotoView(props: LightboxSlideMobilePhotoViewProps) {
  const { img, isCurrent, isZoomed, setIsZoomed, refs, onTouchStartCapture, onTouchMoveCapture } = props;
  const { handleInit, handleTransformed } = createMobileTransformCallbacks(
    refs,
    isCurrent,
    isZoomed,
    setIsZoomed
  );

  return (
    <div
      className="w-full h-full relative flex items-center justify-center bg-transparent touch-none select-none overflow-hidden"
      onTouchStartCapture={onTouchStartCapture}
      onTouchMoveCapture={onTouchMoveCapture}
    >
      <TransformWrapper
        key={`zoom-${img.id}`}
        initialScale={1}
        minScale={1}
        maxScale={6}
        centerOnInit={true}
        centerZoomedOut={true}
        wheel={{ disabled: !isCurrent, step: 0.15 }}
        doubleClick={{ disabled: !isCurrent, mode: 'toggle', step: 2.5 }}
        panning={{ disabled: !isCurrent || !isZoomed, velocityDisabled: false }}
        pinch={{ disabled: !isCurrent, step: 5 }}
        limitToBounds={true}
        disablePadding={true}
        disabled={!isCurrent}
        onInit={handleInit}
        onTransformed={handleTransformed}
      >
        <LightboxSlideMobileTransformContent {...props} />
      </TransformWrapper>
    </div>
  );
}
