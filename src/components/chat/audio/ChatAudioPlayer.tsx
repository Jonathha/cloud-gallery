import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { ChatAudioPlayerProps } from './audioTypes';
import { memoryAudioCache, setActiveAudio, getActiveAudioElement } from './audioConstants';
import { formatAudioTime } from './audioTimeUtils';
import { attachAudioListeners } from './audioListeners';
import { getOrFetchBlobUrl } from './useAudioPlayerFetch';

export default function ChatAudioPlayer({ msg, isMe }: ChatAudioPlayerProps) {
  const initialDuration = msg.audioDurationMs ? msg.audioDurationMs / 1000 : 0;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (msg.id && msg.audioUrl && msg.audioUrl.startsWith('blob:')) {
      memoryAudioCache.set(msg.id, msg.audioUrl);
    }
  }, [msg.id, msg.audioUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (audioRef.current && getActiveAudioElement() === audioRef.current) {
        audioRef.current.pause();
        setActiveAudio(null, null);
      }
    };
  }, []);

  const displayDuration = duration > 0 ? duration : initialDuration;

  const handlePauseActive = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleFetchBlob = async () => {
    return getOrFetchBlobUrl(msg, setIsLoading);
  };

  const togglePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    const activeEl = getActiveAudioElement();
    if (activeEl && activeEl !== audioRef.current) {
      setActiveAudio(audioRef.current, handlePauseActive);
    }

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
      attachAudioListeners(audio, isMountedRef, isDraggingRef, setCurrentTime, setDuration, setIsPlaying, setIsLoading);
    }

    let src = audio.src;
    if (!src || src === 'about:blank' || src === window.location.href) {
      const blobUrl = await handleFetchBlob();
      if (!blobUrl) return;
      audio.src = blobUrl;
    }

    setActiveAudio(audio, handlePauseActive);

    try {
      await audio.play();
      if (isMountedRef.current) {
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[ChatAudioPlayer] Erro ao reproduzir:', err);
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    }
  };

  const currentDisplayTime = isPlaying || currentTime > 0 ? currentTime : displayDuration;
  const progressPercent = displayDuration > 0 ? Math.min(100, Math.max(0, (currentTime / displayDuration) * 100)) : 0;

  return (
    <div
      className={`flex items-center gap-2.5 w-full py-0.5 select-none ${
        isMe ? 'text-black' : 'text-zinc-100'
      }`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={togglePlayPause}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={isLoading}
        className={`w-7 h-7 rounded-full grid place-items-center shrink-0 p-0 leading-none transition-transform active:scale-95 cursor-pointer ${
          isMe
            ? 'bg-black text-white hover:bg-zinc-800'
            : 'bg-white text-black hover:bg-zinc-200'
        }`}
        title={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isLoading ? (
          <Loader2 size={13} className="animate-spin block" />
        ) : isPlaying ? (
          <Pause size={13} className="fill-current block" />
        ) : (
          <Play size={13} className="fill-current block" />
        )}
      </button>

      <div className="flex-1 relative flex items-center h-4 min-w-0">
        <div className={`w-full h-1.5 rounded-full ${isMe ? 'bg-black/15' : 'bg-white/15'} overflow-hidden relative`}>
          <div
            className={`h-full rounded-full transition-all duration-75 ${isMe ? 'bg-black' : 'bg-white'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <span className="text-[11px] leading-none font-medium tabular-nums shrink-0 opacity-80 min-w-[26px] text-right">
        {formatAudioTime(currentDisplayTime)}
      </span>
    </div>
  );
}
