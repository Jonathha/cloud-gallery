import React, { useMemo } from 'react';
import { ChevronLeft, Scan, RotateCw } from 'lucide-react';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';

interface Props {
  props: LightboxVideoPlayerProps;
  state: LightboxVideoState;
  actions: VideoActions;
}

export function VideoPlayerHeader({ props, state, actions }: Props) {
  const videoTitle = useMemo(() => {
    if (props.img.id && props.img.id.length > 24) {
      return `video_${props.img.id.slice(0, 8)}...`;
    }
    return `video_${props.img.id || 'reproducao'}`;
  }, [props.img.id]);

  return (
    <div className="w-full flex items-center justify-between px-4 pt-4 sm:pt-6 sm:px-6 pointer-events-auto">
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="video-player-btn-back"
          type="button"
          onClick={actions.handleStopPlay}
          className="p-2 text-white/90 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Voltar ao início"
        >
          <ChevronLeft size={26} className="stroke-[2.2]" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="text-white font-medium text-base truncate max-w-[180px] sm:max-w-xs">
            {videoTitle}
          </span>
          <span className="text-[11px] font-semibold text-white/90 bg-white/20 px-1.5 py-0.5 rounded border border-white/20">
            CC
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          id="video-player-btn-fit"
          type="button"
          onClick={actions.toggleFitMode}
          className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title={state.fitMode === 'contain' ? 'Preencher tela' : 'Ajustar à tela'}
        >
          <Scan size={20} />
        </button>

        <button
          id="video-player-btn-rotate-top"
          type="button"
          onClick={actions.handleRotate}
          className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Girar tela"
        >
          <RotateCw size={20} />
        </button>
      </div>
    </div>
  );
}
