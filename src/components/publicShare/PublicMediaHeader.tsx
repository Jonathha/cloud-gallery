import React from 'react';
import { Shield, Clock, Maximize, Minimize, Maximize2, Minimize2 } from 'lucide-react';

interface PublicMediaHeaderProps {
  showControls: boolean;
  isVideo: boolean;
  timeLeft?: number | null;
  imageFit: 'contain' | 'cover';
  setImageFit: React.Dispatch<React.SetStateAction<'contain' | 'cover'>>;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export default function PublicMediaHeader({
  showControls,
  isVideo,
  timeLeft,
  imageFit,
  setImageFit,
  isFullscreen,
  toggleFullscreen,
}: PublicMediaHeaderProps) {
  return (
    <header
      className={`absolute top-0 inset-x-0 p-3 sm:p-5 flex justify-between items-center bg-gradient-to-b from-black/85 via-black/40 to-transparent z-40 transition-opacity duration-300 ${
        showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Left: App Identity */}
      <div className="flex items-center gap-2.5">
        <a
          href="/"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md text-white transition-all active:scale-95 group"
        >
          <div className="w-6 h-6 rounded-full bg-blue-600/80 flex items-center justify-center text-white">
            <Shield size={13} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold tracking-tight text-white leading-tight">
              Cloud Gallery
            </span>
            <span className="text-[10px] text-zinc-400 leading-none group-hover:text-zinc-300">
              Visualização Segura
            </span>
          </div>
        </a>
      </div>

      {/* Center: One-time view countdown if applicable */}
      {timeLeft !== null && timeLeft !== undefined && (
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border ${
            timeLeft <= 15
              ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          }`}
        >
          <Clock size={13} className="shrink-0" />
          <span>
            Expira em 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}s
          </span>
        </div>
      )}

      {/* Right: Fit Toggle & Fullscreen */}
      <div className="flex items-center gap-1 sm:gap-2">
        {!isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setImageFit((prev) => (prev === 'contain' ? 'cover' : 'contain'));
            }}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          >
            {imageFit === 'contain' ? <Maximize size={20} /> : <Minimize size={20} />}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>
    </header>
  );
}
