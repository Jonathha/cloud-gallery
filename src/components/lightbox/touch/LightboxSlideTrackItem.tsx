import React from 'react';
import { DecryptedImage } from '../../../types';
import { LightboxSlideContent } from '../LightboxSlideContent';
import { LightboxTouchSurfaceProps } from './lightboxTouchSurfaceTypes';

interface LightboxSlideTrackItemProps {
  img: DecryptedImage;
  index: number;
  currentIndex: number;
  containerWidth: number;
  surfaceProps: LightboxTouchSurfaceProps;
  setIsPlaybackActive: (active: boolean) => void;
}

export function LightboxSlideTrackItem({
  img,
  index,
  currentIndex,
  containerWidth,
  surfaceProps,
  setIsPlaybackActive,
}: LightboxSlideTrackItemProps) {
  const isNear = Math.abs(index - currentIndex) <= 1;
  const isCurrent = index === currentIndex;
  if (!isNear) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: index * (containerWidth + 40),
        width: containerWidth,
        height: '100%',
      }}
    >
      <LightboxSlideContent
        img={img}
        isCurrent={isCurrent}
        selectedImage={surfaceProps.selectedImage}
        downloadingFull={surfaceProps.downloadingFull}
        imageFit={surfaceProps.imageFit}
        setImageFit={surfaceProps.setImageFit}
        isZoomed={surfaceProps.isZoomed}
        setIsZoomed={surfaceProps.setIsZoomed}
        showControls={surfaceProps.showControls}
        setShowControls={surfaceProps.setShowControls}
        onClose={surfaceProps.onClose}
        onDelete={surfaceProps.onDelete}
        onOpenDetails={surfaceProps.onOpenDetails}
        setIsShareOpen={surfaceProps.setIsShareOpen}
        setIsPlaybackActive={setIsPlaybackActive}
      />
    </div>
  );
}
