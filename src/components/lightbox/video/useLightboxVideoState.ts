import { useState, useRef } from 'react';

export function useLightboxVideoState(initialFit: 'contain' | 'cover' = 'contain') {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>(initialFit);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const lastTouchTimeRef = useRef<number>(0);

  return {
    isPlaying, setIsPlaying,
    hasStartedPlaying, setHasStartedPlaying,
    currentTime, setCurrentTime,
    duration, setDuration,
    isMuted, setIsMuted,
    isLocked, setIsLocked,
    rotation, setRotation,
    fitMode, setFitMode,
    isBuffering, setIsBuffering,
    isScrubbing, setIsScrubbing,
    videoRef, progressBarRef,
    controlsTimeoutRef, lastTouchTimeRef
  };
}

export type LightboxVideoState = ReturnType<typeof useLightboxVideoState>;
