import React from 'react';
import { Lock, Film, Image as ImageIcon } from 'lucide-react';
import { DecryptedImage } from '../../../types';

export const GalleryItemFailedState: React.FC<{ isMissing?: boolean }> = ({ isMissing }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 p-2 text-center bg-zinc-950/40">
      <Lock size={20} className="mb-1 opacity-40 text-zinc-500" />
      <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-zinc-500">
        {isMissing ? 'Indisponível' : 'Erro'}
      </span>
    </div>
  );
};

export const GalleryItemProtectedState: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-zinc-950/60 transition-colors ${isHovered ? 'text-zinc-200' : 'text-zinc-400'}`}>
      <div className="p-2.5 rounded-full bg-white/[0.04] border border-white/5 mb-1.5">
        <Lock size={20} className="text-zinc-400" strokeWidth={1.75} />
      </div>
      <span className="text-[9px] font-medium tracking-wider uppercase text-zinc-500">Protegida</span>
    </div>
  );
};

export const GalleryItemNoThumbnailState: React.FC<{ img: DecryptedImage; isHovered: boolean }> = ({ img, isHovered }) => {
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-colors ${isHovered ? 'text-zinc-300' : 'text-zinc-500'}`}>
      {img.isVideo ? <Film size={26} className="opacity-40 mb-1" /> : <ImageIcon size={26} className="opacity-40 mb-1" />}
      <span className="text-[9px] font-mono tracking-wider opacity-60 uppercase">{img.isVideo ? 'Vídeo' : 'Imagem'}</span>
    </div>
  );
};
