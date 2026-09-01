import React from 'react';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';
import { VideoEffects } from './useVideoEffects';

export function useVideoSeek(state: LightboxVideoState, actions: VideoActions, effects: VideoEffects) {
  const handleSeek = (clientX: number) => {
    if (!state.progressBarRef.current || !state.videoRef.current || !state.duration) return;
    const rect = state.progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * state.duration;
    state.videoRef.current.currentTime = targetTime;
    state.setCurrentTime(targetTime);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    handleSeek(e.clientX);
    effects.resetControlsTimer();
  };

  const handleTouchStartSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    state.setIsScrubbing(true);
    handleSeek(e.touches[0].clientX);
  };

  const handleTouchMoveSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (state.isScrubbing) {
      handleSeek(e.touches[0].clientX);
    }
  };

  const handleTouchEndSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    state.setIsScrubbing(false);
    effects.resetControlsTimer();
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    if (Date.now() - state.lastTouchTimeRef.current < 400) {
      return;
    }
    e.stopPropagation();
    actions.toggleControlsState();
  };

  return {
    handleSeek, handleProgressBarClick, handleTouchStartSeek, handleTouchMoveSeek,
    handleTouchEndSeek, handleScreenClick
  };
}

export type VideoSeek = ReturnType<typeof useVideoSeek>;
