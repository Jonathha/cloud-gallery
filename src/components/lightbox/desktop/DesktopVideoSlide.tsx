import React from 'react';
import { Play } from 'lucide-react';
import { DecryptedImage } from '../../../types';
import LightboxVideoPlayer from '../LightboxVideoPlayer';

interface DesktopVideoSlideProps {
  img: DecryptedImage;
  isCurrent: boolean;
  selectedImage: string | null;
  downloadingFull: boolean;
  imageFit: 'contain' | 'cover';
  setImageFit?: (fit: 'contain' | 'cover') => void;
  showControls: boolean;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  setIsShareOpen?: (open: boolean) => void;
  setIsPlaybackActive?: (active: boolean) => void;
}

export default function DesktopVideoSlide({
  img,
  isCurrent,
  selectedImage,
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
}: DesktopVideoSlideProps) {
  const validVideoSrc = (isCurrent)
    ? ((selectedImage && (selectedImage.startsWith('blob:') || selectedImage.startsWith('data:video/')))
      ? selectedImage
      : (img.originalUrl && (img.originalUrl.startsWith('blob:') || img.originalUrl.startsWith('data:video/')))
        ? img.originalUrl
        : (img.url && (img.url.startsWith('blob:') || img.url.startsWith('data:video/')))
          ? img.url
          : undefined)
    : undefined;

  // If this slide is a video and is currently selected
  if (isCurrent) {
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

  // If this slide is a video and is an adjacent slide
  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black select-none pointer-events-none">
      <img
        src={img.originalUrl || img.url}
        alt="Video preview"
        className={`w-full h-full ${imageFit === 'cover' ? 'object-cover' : 'object-contain'}`}
        draggable={false}
      />

      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <div className="bg-black/60 text-white rounded-full p-4 backdrop-blur-sm border border-white/20">
          <Play className="w-8 h-8 fill-current translate-x-0.5 text-white" />
        </div>
      </div>
    </div>
  );
}
