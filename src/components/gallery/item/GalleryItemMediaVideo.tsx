import React from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { DecryptedImage } from '../../../types';
import { saveMediaDimensions } from '../../../utils/aspectRatioCache';

interface GalleryItemMediaVideoProps {
  img: DecryptedImage;
  displayUrl: string;
  fullMediaUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isHovered: boolean;
  isFullMediaLoaded: boolean;
  setIsFullMediaLoaded: (val: boolean) => void;
  handleMediaLoad: (e: any) => void;
  handleImageError: (e: any) => void;
}

export const GalleryItemMediaVideo: React.FC<GalleryItemMediaVideoProps> = ({
  img, displayUrl, fullMediaUrl, videoRef, isHovered,
  isFullMediaLoaded, setIsFullMediaLoaded, handleMediaLoad, handleImageError
}) => {
  return (
    <>
      <motion.img
        layoutId={`gallery-media-${img.id}`}
        transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
        src={img.url} alt="" decoding="async"
        className={`w-full h-full object-cover select-none transition-[filter] duration-200 ${isHovered ? 'brightness-95' : ''}`}
        style={{ display: 'block' }} referrerPolicy="no-referrer" draggable={false}
        onContextMenu={(e) => e.preventDefault()} onLoad={handleMediaLoad} onError={handleImageError}
      />
      {(fullMediaUrl || (displayUrl && displayUrl !== img.url)) && (
        <video
          ref={videoRef}
          src={fullMediaUrl || displayUrl}
          poster={img.url} muted playsInline preload="metadata"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 select-none ${isHovered ? 'brightness-95' : ''} ${isFullMediaLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ display: 'block' }} onError={handleImageError}
          onLoadedData={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) {
              saveMediaDimensions(img.id, v.videoWidth, v.videoHeight, v.duration);
            }
            setIsFullMediaLoaded(true);
          }} controls={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}
      <div className={`absolute inset-0 flex items-center justify-center transition-colors pointer-events-none ${isHovered ? 'bg-black/20' : 'bg-black/10'}`}>
        <div className={`p-2 bg-black/60 text-white rounded-full transition-transform duration-200 shadow-sm ${isHovered ? 'scale-110' : ''}`}>
          <Play size={12} fill="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" />
        </div>
      </div>
    </>
  );
};
