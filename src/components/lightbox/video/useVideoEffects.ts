import { useEffect, useCallback } from 'react';
import { LightboxVideoState } from './useLightboxVideoState';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';

export function useVideoEffects(state: LightboxVideoState, props: LightboxVideoPlayerProps) {
  useEffect(() => {
    props.setIsPlaybackActive?.(state.hasStartedPlaying);
  }, [state.hasStartedPlaying, props.setIsPlaybackActive]);

  useEffect(() => {
    if (!props.isCurrent) {
      if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
      if (state.videoRef.current) {
        try { state.videoRef.current.pause(); } catch (e) {}
      }
      state.setIsPlaying(false);
      state.setHasStartedPlaying(false);
      props.setIsPlaybackActive?.(false);
      return;
    }

    if (!state.hasStartedPlaying && state.videoRef.current) {
      state.videoRef.current.muted = true;
      state.videoRef.current.loop = true;
      state.videoRef.current.play()
        .then(() => state.setIsPlaying(true))
        .catch((err) => console.warn('Muted preview autoplay blocked:', err));
    }
  }, [props.isCurrent, state.hasStartedPlaying, props.setIsPlaybackActive, state.controlsTimeoutRef, state.videoRef, state.setIsPlaying, state.setHasStartedPlaying]);

  const enterFullscreen = useCallback(() => {
    try {
      const elem = document.getElementById('lightbox-video-container') || document.documentElement;
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
        else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
        else if ((elem as any).mozRequestFullScreen) (elem as any).mozRequestFullScreen();
        else if ((elem as any).msRequestFullscreen) (elem as any).msRequestFullscreen();
      }
    } catch (e) { console.warn('Fullscreen request failed:', e); }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      else if ((document as any).webkitFullscreenElement) (document as any).webkitExitFullscreen?.();
    } catch (e) { console.warn('Exit fullscreen error:', e); }
  }, []);

  const resetControlsTimer = useCallback(() => {
    if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
    if (state.isPlaying && !state.isLocked) {
      state.controlsTimeoutRef.current = setTimeout(() => {
        props.setShowControls(false);
      }, 3500);
    }
  }, [state.isPlaying, state.isLocked, props.setShowControls, state.controlsTimeoutRef]);

  useEffect(() => {
    return () => {
      if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
      exitFullscreen();
    };
  }, [state.controlsTimeoutRef, exitFullscreen]);

  return { enterFullscreen, exitFullscreen, resetControlsTimer };
}

export type VideoEffects = ReturnType<typeof useVideoEffects>;
