import React from 'react';
import type { LightboxVideoState } from './useLightboxVideoState';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import type { VideoEffects } from './useVideoEffects';

export function useViewActions(state: LightboxVideoState, props: LightboxVideoPlayerProps, effects: VideoEffects) {
  const toggleControlsState = () => {
    if (state.hasStartedPlaying) {
      if (state.isLocked) return;
      if (props.showControls) {
        if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
        props.setShowControls(false);
      } else {
        props.setShowControls(true);
        if (state.isPlaying) {
          if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
          state.controlsTimeoutRef.current = setTimeout(() => { props.setShowControls(false); }, 3500);
        }
      }
    } else {
      props.setShowControls((prev) => !prev);
    }
  };

  const handleRotate = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    state.setRotation((prev) => (prev + 90) % 360);
    effects.resetControlsTimer();
  };

  const togglePip = async (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!state.videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await state.videoRef.current.requestPictureInPicture();
    } catch (err) { console.warn('PiP error:', err); }
    effects.resetControlsTimer();
  };

  const toggleFullscreen = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!document.fullscreenElement) effects.enterFullscreen();
    else effects.exitFullscreen();
    effects.resetControlsTimer();
  };

  const toggleFitMode = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const nextFit = state.fitMode === 'contain' ? 'cover' : 'contain';
    state.setFitMode(nextFit);
    props.setImageFit?.(nextFit);
    effects.resetControlsTimer();
  };

  const lockControls = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    state.setIsLocked(true);
    props.setShowControls(false);
  };

  const unlockControls = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    state.setIsLocked(false);
    props.setShowControls(true);
  };

  return { toggleControlsState, handleRotate, togglePip, toggleFullscreen, toggleFitMode, lockControls, unlockControls };
}
