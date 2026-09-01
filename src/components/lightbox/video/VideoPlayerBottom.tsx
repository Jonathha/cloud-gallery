import React from 'react';
import { Maximize2, Scan, RotateCw, Lock } from 'lucide-react';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';
import { VideoSeek } from './useVideoSeek';
import { VideoPlayerTimeline } from './VideoPlayerTimeline';
import { formatTime } from './utils';

interface Props {
  state: LightboxVideoState;
  actions: VideoActions;
  seek: VideoSeek;
}

export function VideoPlayerBottom({ state, actions, seek }: Props) {
  return (
    <div className="w-full px-4 sm:px-8 pb-6 sm:pb-8 flex flex-col gap-3 pointer-events-auto">
      <div className="w-full flex items-center justify-between text-xs sm:text-sm font-medium text-white/90 px-1">
        <span>{formatTime(state.currentTime)}</span>
        <span>{formatTime(state.duration)}</span>
      </div>

      <VideoPlayerTimeline state={state} seek={seek} />

      <div className="w-full flex items-center justify-around pt-2">
        <button
          id="video-player-btn-fullscreen"
          type="button"
          onClick={actions.toggleFullscreen}
          className="p-2.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Tela cheia"
        >
          <Maximize2 size={22} />
        </button>

        <button
          id="video-player-btn-pip"
          type="button"
          onClick={actions.togglePip}
          className="p-2.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Picture-in-Picture"
        >
          <Scan size={22} />
        </button>

        <button
          id="video-player-btn-rotate-bottom"
          type="button"
          onClick={actions.handleRotate}
          className="p-2.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Girar vídeo"
        >
          <RotateCw size={22} />
        </button>

        <button
          id="video-player-btn-lock"
          type="button"
          onClick={actions.lockControls}
          className="p-2.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Bloquear controles"
        >
          <Lock size={22} />
        </button>
      </div>
    </div>
  );
}
