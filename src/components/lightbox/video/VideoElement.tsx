import React from 'react';
import { Loader2 } from 'lucide-react';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import { LightboxVideoState } from './useLightboxVideoState';

interface VideoElementProps {
  props: LightboxVideoPlayerProps;
  state: LightboxVideoState;
}

export function VideoElement({ props, state }: VideoElementProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden pointer-events-auto">
      {props.src ? (
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
          style={{
            transform: `rotate(${state.rotation}deg)`,
            maxWidth: state.rotation % 180 !== 0 ? '100vh' : '100vw',
            maxHeight: state.rotation % 180 !== 0 ? '100vw' : '100vh',
          }}
        >
          <video
            ref={state.videoRef}
            src={props.src}
            poster={props.img.url}
            playsInline
            preload="auto"
            className={`w-full h-full ${state.fitMode === 'cover' ? 'object-cover' : 'object-contain'} bg-black`}
            onPlay={() => state.setIsPlaying(true)}
            onPause={() => state.setIsPlaying(false)}
            onTimeUpdate={() => {
              if (state.videoRef.current && !state.isScrubbing) {
                state.setCurrentTime(state.videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (state.videoRef.current) {
                state.setDuration(state.videoRef.current.duration || 0);
              }
            }}
            onWaiting={() => state.setIsBuffering(true)}
            onPlaying={() => state.setIsBuffering(false)}
            onEnded={() => {
              if (state.hasStartedPlaying) {
                state.setIsPlaying(false);
                props.setShowControls(true);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
          <span className="text-zinc-400 text-sm">Carregando vídeo...</span>
        </div>
      )}

      {state.isBuffering && state.hasStartedPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-xs">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {props.downloadingFull && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 z-30">
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
