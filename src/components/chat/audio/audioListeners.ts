export function attachAudioListeners(
  audio: HTMLAudioElement,
  isMountedRef: React.MutableRefObject<boolean>,
  isDraggingRef: React.MutableRefObject<boolean>,
  setCurrentTime: (time: number) => void,
  setDuration: (dur: number) => void,
  setIsPlaying: (play: boolean) => void,
  setIsLoading: (load: boolean) => void
) {
  audio.ontimeupdate = () => {
    if (isMountedRef.current && !isDraggingRef.current) {
      setCurrentTime(audio.currentTime);
    }
  };

  audio.onloadedmetadata = () => {
    if (isMountedRef.current && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  audio.onended = () => {
    if (isMountedRef.current) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  audio.onerror = () => {
    if (isMountedRef.current) {
      setIsPlaying(false);
      setIsLoading(false);
    }
  };
}
