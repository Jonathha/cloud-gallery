import React from 'react';
import { AnimatePresence } from 'motion/react';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';
import { VideoPreviewTopBar } from './VideoPreviewTopBar';
import { VideoPreviewBottomBar } from './VideoPreviewBottomBar';

interface VideoPreviewProps {
  props: LightboxVideoPlayerProps;
  state: LightboxVideoState;
  actions: VideoActions;
}

export function VideoPreview({ props, state, actions }: VideoPreviewProps) {
  if (state.hasStartedPlaying) return null;

  return (
    <div className="relative z-40 w-full h-full flex flex-col justify-between pointer-events-none">
      <AnimatePresence>
        {props.showControls && (
          <VideoPreviewTopBar props={props} actions={actions} />
        )}
      </AnimatePresence>

      <div className="w-full flex flex-col items-center pointer-events-none mt-auto">
        <AnimatePresence>
          {props.showControls && (
            <VideoPreviewBottomBar props={props} state={state} actions={actions} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
