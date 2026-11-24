import React from 'react';
import { Play } from 'lucide-react';
import { DecryptedImage } from '../../../types';

interface LightboxSlideMobileVideoPreviewProps {
  img: DecryptedImage;
  imageFit: 'contain' | 'cover';
}

export function LightboxSlideMobileVideoPreview({
  img,
  imageFit,
}: LightboxSlideMobileVideoPreviewProps) {
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
