import React from 'react';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoSeek } from './useVideoSeek';

interface Props {
  state: LightboxVideoState;
  seek: VideoSeek;
}

export function VideoPlayerTimeline({ state, seek }: Props) {
  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div
      ref={state.progressBarRef}
      id="video-player-progress-bar"
      onClick={seek.handleProgressBarClick}
      onTouchStart={seek.handleTouchStartSeek}
      onTouchMove={seek.handleTouchMoveSeek}
      onTouchEnd={seek.handleTouchEndSeek}
      className="relative w-full h-7 flex items-center cursor-pointer group touch-none"
    >
      <div className="w-full h-1 bg-white/25 group-hover:h-1.5 rounded-full overflow-hidden transition-all">
        <div
          className="h-full bg-white rounded-full transition-[width] duration-75"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg pointer-events-none transition-transform group-hover:scale-125"
        style={{ left: `${progressPercent}%` }}
      />
    </div>
  );
}
