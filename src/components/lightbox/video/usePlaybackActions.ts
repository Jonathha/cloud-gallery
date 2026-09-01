import React from 'react';
import type { LightboxVideoState } from './useLightboxVideoState';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import type { VideoEffects } from './useVideoEffects';

export function usePlaybackActions(state: LightboxVideoState, props: LightboxVideoPlayerProps, effects: VideoEffects) {
  const handleStartPlay = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
    state.setHasStartedPlaying(true);
    props.setShowControls(false);
    effects.enterFullscreen();
    if (state.videoRef.current) {
      state.videoRef.current.currentTime = 0;
      state.videoRef.current.muted = state.isMuted;
      state.videoRef.current.loop = false;
      state.videoRef.current.play().then(() => state.setIsPlaying(true)).catch((err) => console.warn('Play error:', err));
    }
  };

  const handleStopPlay = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
    state.setHasStartedPlaying(false);
    props.setShowControls(true);
    effects.exitFullscreen();
    if (state.videoRef.current) {
      state.videoRef.current.currentTime = 0;
      state.videoRef.current.muted = true;
      state.videoRef.current.loop = true;
      state.videoRef.current.play().then(() => state.setIsPlaying(true)).catch((err) => console.warn('Stop play preview error:', err));
    }
  };

  const togglePlayPause = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!state.videoRef.current) return;
    if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
    if (state.videoRef.current.paused) {
      state.videoRef.current.play().catch((err) => console.warn('Play error:', err));
      state.setIsPlaying(true);
      state.controlsTimeoutRef.current = setTimeout(() => { props.setShowControls(false); }, 2500);
    } else {
      state.videoRef.current.pause();
      state.setIsPlaying(false);
      props.setShowControls(true);
    }
  };

  const handleSkip = (seconds: number, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!state.videoRef.current) return;
    state.videoRef.current.currentTime = Math.max(0, Math.min(state.duration, state.videoRef.current.currentTime + seconds));
    state.setCurrentTime(state.videoRef.current.currentTime);
    effects.resetControlsTimer();
  };

  const toggleMute = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!state.videoRef.current) return;
    const nextMuted = !state.isMuted;
    state.setIsMuted(nextMuted);
    if (state.hasStartedPlaying) {
      state.videoRef.current.muted = nextMuted;
    } else {
      state.videoRef.current.muted = true;
    }
    effects.resetControlsTimer();
  };

  return { handleStartPlay, handleStopPlay, togglePlayPause, handleSkip, toggleMute };
}
