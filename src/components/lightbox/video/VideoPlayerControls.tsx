import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';
import { VideoSeek } from './useVideoSeek';
import { VideoPlayerHeader } from './VideoPlayerHeader';
import { VideoPlayerCenter } from './VideoPlayerCenter';
import { VideoPlayerBottom } from './VideoPlayerBottom';

interface Props {
  props: LightboxVideoPlayerProps;
  state: LightboxVideoState;
  actions: VideoActions;
  seek: VideoSeek;
}

export function VideoPlayerControls({ props, state, actions, seek }: Props) {
  if (!state.hasStartedPlaying) return null;

  return (
    <AnimatePresence>
      {props.showControls && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-40 w-full h-full flex flex-col justify-between pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-black/90"
        >
          <VideoPlayerHeader props={props} state={state} actions={actions} />
          <VideoPlayerCenter state={state} actions={actions} />
          <VideoPlayerBottom state={state} actions={actions} seek={seek} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
