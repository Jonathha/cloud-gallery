import type { LightboxVideoState } from './useLightboxVideoState';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import type { VideoEffects } from './useVideoEffects';
import { usePlaybackActions } from './usePlaybackActions';
import { useViewActions } from './useViewActions';

export function useVideoActions(state: LightboxVideoState, props: LightboxVideoPlayerProps, effects: VideoEffects) {
  const playbackActions = usePlaybackActions(state, props, effects);
  const viewActions = useViewActions(state, props, effects);

  return {
    ...playbackActions,
    ...viewActions
  };
}

export type VideoActions = ReturnType<typeof useVideoActions>;
