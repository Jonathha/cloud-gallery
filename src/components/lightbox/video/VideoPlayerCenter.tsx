import React from 'react';
import { RotateCcw, RotateCw, Play, Pause } from 'lucide-react';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';

interface Props {
  state: LightboxVideoState;
  actions: VideoActions;
}

export function VideoPlayerCenter({ state, actions }: Props) {
  return (
    <div className="w-full flex items-center justify-center pointer-events-auto">
      <div
        className="flex items-center justify-center gap-8 sm:gap-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="video-player-btn-rewind"
          type="button"
          onClick={(e) => actions.handleSkip(-10, e)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 border border-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-lg transition-all cursor-pointer"
          title="Voltar 10 segundos"
        >
          <RotateCcw size={22} className="stroke-[2.2]" />
        </button>

        <button
          id="video-player-btn-center-play"
          type="button"
          onClick={actions.togglePlayPause}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 hover:bg-black/70 active:scale-95 border border-white/25 backdrop-blur-md flex items-center justify-center text-white shadow-xl transition-all cursor-pointer"
          title={state.isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {state.isPlaying ? (
            <Pause size={30} className="fill-white text-white" />
          ) : (
            <Play size={30} className="fill-white text-white translate-x-0.5" />
          )}
        </button>

        <button
          id="video-player-btn-forward"
          type="button"
          onClick={(e) => actions.handleSkip(10, e)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 border border-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-lg transition-all cursor-pointer"
          title="Avançar 10 segundos"
        >
          <RotateCw size={22} className="stroke-[2.2]" />
        </button>
      </div>
    </div>
  );
}
