import React from 'react';
import LightboxVideoPlayer from '../LightboxVideoPlayer';
import { LightboxSlideMobileContentProps } from './lightboxSlideMobileTypes';

interface LightboxSlideMobileVideoActiveProps extends LightboxSlideMobileContentProps {
  validVideoSrc?: string;
}

export function LightboxSlideMobileVideoActive({
  img,
  isCurrent,
  downloadingFull,
  imageFit,
  setImageFit,
  showControls,
  setShowControls,
  onClose,
  onDelete,
  onOpenDetails,
  setIsShareOpen,
  setIsPlaybackActive,
  validVideoSrc,
}: LightboxSlideMobileVideoActiveProps) {
  return (
    <div className="w-full h-full relative bg-black select-none">
      <LightboxVideoPlayer
        img={img}
        src={validVideoSrc}
        isCurrent={isCurrent}
        showControls={showControls}
        setShowControls={setShowControls}
        imageFit={imageFit}
        setImageFit={setImageFit}
        onClose={onClose}
        onDelete={onDelete}
        onOpenDetails={onOpenDetails || (() => {})}
        setIsShareOpen={setIsShareOpen || (() => {})}
        downloadingFull={downloadingFull}
        setIsPlaybackActive={setIsPlaybackActive}
      />
    </div>
  );
}
