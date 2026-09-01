import { useEffect, useRef } from 'react';
import type { LightboxVideoState } from './useLightboxVideoState';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import type { VideoActions } from './useVideoActions';
import type { VideoEffects } from './useVideoEffects';

export function useVideoKeyboard(
  state: LightboxVideoState,
  props: LightboxVideoPlayerProps,
  actions: VideoActions,
  effects: VideoEffects
) {
  // Use a ref to store the latest dependencies to avoid unbinding and rebinding the keydown listener on every render
  const latestRef = useRef({ state, props, actions, effects });
  
  useEffect(() => {
    latestRef.current = { state, props, actions, effects };
  });

  useEffect(() => {
    if (!props.isCurrent) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { state: s, props: p, actions: a, effects: ef } = latestRef.current;
      
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (s.hasStartedPlaying) a.togglePlayPause();
        else a.handleStartPlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        if (s.hasStartedPlaying) {
          e.preventDefault();
          a.handleSkip(-10);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        if (s.hasStartedPlaying) {
          e.preventDefault();
          a.handleSkip(10);
        }
      } else if (e.key === 'm') {
        e.preventDefault();
        a.toggleMute();
      } else if (e.key === 'f') {
        e.preventDefault();
        a.toggleFullscreen();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (s.hasStartedPlaying) a.handleStopPlay();
        else {
          ef.exitFullscreen();
          p.onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props.isCurrent]); // ONLY binds once when isCurrent becomes true
}
