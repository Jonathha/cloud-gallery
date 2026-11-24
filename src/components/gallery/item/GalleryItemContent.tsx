import React from 'react';
import { DecryptedImage } from '../../../types';
import {
  GalleryItemFailedState,
  GalleryItemProtectedState,
  GalleryItemNoThumbnailState
} from './GalleryItemPlaceholders';
import { GalleryItemMediaVideo } from './GalleryItemMediaVideo';
import { GalleryItemMediaImage } from './GalleryItemMediaImage';

interface GalleryItemContentProps {
  img: DecryptedImage;
  securityImageId: string | null;
  isExtraUnlocked: boolean;
  extraPassword: string | null;
  isHovered: boolean;
  displayUrl: string;
  fullMediaUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  fullImageRef: React.RefObject<HTMLImageElement | null>;
  isFullMediaLoaded: boolean;
  setIsFullMediaLoaded: (val: boolean) => void;
  isFullImageLoaded: boolean;
  setIsFullImageLoaded: (val: boolean) => void;
  handleMediaLoad: (e: any) => void;
  handleImageError: (e: any) => void;
}

export const GalleryItemContent: React.FC<GalleryItemContentProps> = ({
  img, securityImageId, isExtraUnlocked, extraPassword, isHovered,
  displayUrl, fullMediaUrl, videoRef, fullImageRef,
  isFullMediaLoaded, setIsFullMediaLoaded, isFullImageLoaded, setIsFullImageLoaded,
  handleMediaLoad, handleImageError
}) => {
  if (img.isMissing || img.failed) {
    return <GalleryItemFailedState isMissing={img.isMissing} />;
  }
  if (img.id === securityImageId && !isExtraUnlocked && extraPassword) {
    return <GalleryItemProtectedState isHovered={isHovered} />;
  }
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-transparent">
      {img.noThumbnail ? (
        <GalleryItemNoThumbnailState img={img} isHovered={isHovered} />
      ) : img.isVideo ? (
        <GalleryItemMediaVideo img={img} displayUrl={displayUrl} fullMediaUrl={fullMediaUrl} videoRef={videoRef} isHovered={isHovered} isFullMediaLoaded={isFullMediaLoaded} setIsFullMediaLoaded={setIsFullMediaLoaded} handleMediaLoad={handleMediaLoad} handleImageError={handleImageError} />
      ) : (
        <GalleryItemMediaImage img={img} fullMediaUrl={fullMediaUrl} fullImageRef={fullImageRef} isHovered={isHovered} isFullImageLoaded={isFullImageLoaded} setIsFullImageLoaded={setIsFullImageLoaded} handleMediaLoad={handleMediaLoad} handleImageError={handleImageError} />
      )}
    </div>
  );
};
