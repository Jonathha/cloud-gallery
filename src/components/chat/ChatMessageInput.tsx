import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic, Trash2 } from 'lucide-react';
import { ChatMessage } from './types';
import ChatReplyBanner from './ChatReplyBanner';
import { useAudioRecorder, MAX_RECORDING_SECONDS, RECORDING_WARNING_SECONDS } from './useAudioRecorder';
import { formatRecordingTime } from './audioWavEncoder';
import RecordingWaveform from './RecordingWaveform';

const MAX_TEXT_CHARS = 3000;

const haptic = () => {
  try { if ('vibrate' in navigator) navigator.vibrate(10); } catch { /* ignora */ }
};
const COUNTER_THRESHOLD = 2700;

interface Props {
  onSendMessage: (text: string) => Promise<void>;
  onSendAudio: (blob: Blob, durationMs: number) => Promise<void>;
  disabled: boolean;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

export default function ChatMessageInput({ onSendMessage, onSendAudio, disabled, replyingTo, onCancelReply }: Props) {
  const [text, setText] = useState('');
  const [showSlowSpinner, setShowSlowSpinner] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inFlightCountRef = useRef(0);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmedText = text.trim();
  const charCount = trimmedText.length > 2500 ? [...trimmedText].length : trimmedText.length;
  const overLimit = charCount > MAX_TEXT_CHARS;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { recording, recordingSeconds, recordingStream, processing, interrupted, audioError, clearAudioError, startRecording, stopRecording, cancelProcessing, sendInterrupted, discardInterrupted } = useAudioRecorder(onSendAudio);

  useEffect(() => {
    if (!recording) {
      setConfirmCancel(false);
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    }
  }, [recording]);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  // Gravações de 10s ou mais pedem um segundo toque pra descartar (evita perder áudio sem querer)
  const handleCancelRecording = () => {
    if (recordingSeconds >= 10 && !confirmCancel) {
      setConfirmCancel(true);
      confirmTimerRef.current = setTimeout(() => setConfirmCancel(false), 3000);
      return;
    }
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setConfirmCancel(false);
    stopRecording(false);
  };

  useEffect(() => {
    if (!audioError) return;
    const timer = setTimeout(() => {
      clearAudioError();
    }, 6000);
    return () => clearTimeout(timer);
  }, [audioError, clearAudioError]);

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const formEl = formRef.current;
    if (!formEl) return;
    const handleTouchMove = (e: TouchEvent) => {
      const el = textareaRef.current;
      if (el && (e.target === el || el.contains(e.target as Node)) && el.scrollHeight > el.clientHeight) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    formEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => formEl.removeEventListener('touchmove', handleTouchMove);
  }, []);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, 120);
    el.style.height = nextHeight + 'px';
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || disabled || processing || recording || [...value].length > MAX_TEXT_CHARS) return;

    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }

    inFlightCountRef.current += 1;
    if (!slowTimerRef.current) {
      slowTimerRef.current = setTimeout(() => {
        if (inFlightCountRef.current > 0) {
          setShowSlowSpinner(true);
        }
      }, 1500);
    }

    try {
      await onSendMessage(value);
      textareaRef.current?.focus({ preventScroll: true });
    } catch {
      setText(prev => (prev ? prev : value));
      adjustHeight();
    } finally {
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
      if (inFlightCountRef.current === 0) {
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }
        setShowSlowSpinner(false);
      }
    }
  };

  return (
    <div className="shrink-0 w-full">
      <form ref={formRef} onSubmit={submit} className="pointer-events-auto p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-4 max-w-4xl w-full mx-auto overscroll-none">
        <ChatReplyBanner replyingTo={replyingTo} onCancelReply={onCancelReply} />
        {audioError && (
          <div className="mb-2 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between shadow-sm animate-fade-in">
            <span className="font-medium">{audioError}</span>
            <button
              type="button"
              onClick={clearAudioError}
              className="p-1 hover:text-red-300 cursor-pointer ml-2"
              title="Fechar aviso"
            >
              ✕
            </button>
          </div>
        )}
        {recording || processing || interrupted ? (
          <div className={`flex items-center gap-3 bg-zinc-900 border rounded-2xl pl-4 pr-1.5 h-[44px] animate-bar-in ${processing ? 'border-white/15 shadow-sm' : interrupted ? 'border-amber-500/30 shadow-sm' : 'border-red-500/25 shadow-[0_0_18px_-6px_rgba(239,68,68,0.35)]'}`}>
            {processing ? (
              <>
                <div className="flex items-center gap-2.5 flex-1 text-zinc-300 min-w-0">
                  <Loader2 size={16} className="animate-spin shrink-0" />
                  <span className="text-sm font-medium tracking-tight truncate">Processando áudio…</span>
                </div>
                <button type="button" onClick={cancelProcessing} title="Cancelar e descartar áudio" className="h-9 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-white/5">
                  <Trash2 size={16} />
                  <span>Cancelar</span>
                </button>
              </>
            ) : interrupted ? (
              <>
                <div className="flex items-center gap-2 flex-1 text-amber-400 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm font-semibold tracking-tight leading-tight">
                    Gravação interrompida em {formatRecordingTime(interrupted.seconds)}
                  </span>
                </div>
                <button type="button" onClick={discardInterrupted} title="Descartar áudio" className="h-9 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-white/5">
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Descartar</span>
                </button>
                <span className="w-px h-6 bg-white/10 shrink-0" aria-hidden="true" />
                <button type="button" onClick={sendInterrupted} title="Enviar o que foi gravado" className="w-9 h-9 rounded-xl bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md shrink-0 touch-manipulation">
                  <Send size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col shrink-0">
                  <div className="flex items-center gap-2 text-red-400 min-w-0">
                    <span className="relative flex w-2.5 h-2.5 shrink-0" aria-hidden="true">
                      <span className="absolute inset-0 rounded-full bg-red-500/60 animate-ping motion-reduce:animate-none" />
                      <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
                    </span>
                    <span className="text-sm font-semibold tracking-tight whitespace-nowrap tabular-nums">
                      <span className="hidden min-[380px]:inline">Gravando: </span>{formatRecordingTime(recordingSeconds)} <span className="text-zinc-500 text-xs font-normal">/ {formatRecordingTime(MAX_RECORDING_SECONDS)}</span>
                    </span>
                  </div>
                  {recordingSeconds >= RECORDING_WARNING_SECONDS && (
                    <span className="text-amber-400 text-[11px] font-medium leading-tight pl-[18px]">envia sozinho em {Math.max(0, MAX_RECORDING_SECONDS - recordingSeconds)}s</span>
                  )}
                </div>
                <RecordingWaveform stream={recordingStream} />
                <button type="button" onClick={handleCancelRecording} title="Cancelar e descartar áudio" className={`h-9 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-xs font-medium ${confirmCancel ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'text-zinc-400 hover:text-red-400 hover:bg-white/5'}`}>
                  <Trash2 size={16} />
                  <span className={confirmCancel ? '' : 'hidden sm:inline'}>{confirmCancel ? 'Descartar?' : 'Cancelar'}</span>
                </button>
                <span className="w-px h-6 bg-white/10 shrink-0" aria-hidden="true" />
                <button type="button" onClick={() => { haptic(); stopRecording(true); }} title="Enviar áudio gravado" className="w-9 h-9 rounded-xl bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md shrink-0 touch-manipulation">
                  <Send size={16} />
                </button>
              </>
            )}
          </div>
        ) : (
          <>
          {charCount >= COUNTER_THRESHOLD && (
            <div className={`mb-1.5 px-1 text-right text-[11px] font-medium ${overLimit ? 'text-red-400' : 'text-zinc-500'}`}>
              {charCount.toLocaleString('pt-BR')} / {MAX_TEXT_CHARS.toLocaleString('pt-BR')}
              {overLimit && <span> · apague {(charCount - MAX_TEXT_CHARS).toLocaleString('pt-BR')} para enviar</span>}
            </div>
          )}
          <div className="flex items-end gap-2.5 animate-bar-in">
            <textarea ref={textareaRef} rows={1} value={text} onFocus={() => { if (window.scrollY !== 0) window.scrollTo(0, 0); }} onChange={e => { setText(e.target.value); adjustHeight(); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} placeholder="fale qualquer coisa" aria-label="Escrever mensagem" enterKeyHint="send" autoComplete="off" disabled={disabled || recording} className="flex-1 max-h-[120px] resize-none overflow-y-hidden bg-zinc-900 border border-white/15 focus:border-white/30 rounded-2xl px-4 py-[9px] min-h-[44px] text-[16px] sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-[border-color,box-shadow,opacity] duration-150 overscroll-contain disabled:opacity-50 font-normal leading-6 shadow-sm" />
            <div className="flex items-center shrink-0">
              {text.trim() ? (
                <button key="send" id="chat-send-btn" type="submit" disabled={disabled || processing || overLimit} className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 animate-pop-in active:scale-90 touch-manipulation bg-white hover:bg-zinc-200 text-black shadow-md cursor-pointer disabled:opacity-50">
                  <Send size={15} />
                </button>
              ) : (
                <button key="mic" type="button" onClick={() => { haptic(); startRecording(); }} disabled={disabled || processing} title="Gravar áudio" className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 animate-pop-in active:scale-90 touch-manipulation bg-zinc-800/90 border border-white/5 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer disabled:opacity-50">
                  {showSlowSpinner ? (
                    <Loader2 size={16} className="animate-spin text-zinc-400" />
                  ) : (
                    <Mic size={16} />
                  )}
                </button>
              )}
            </div>
          </div>
          </>
        )}
      </form>
    </div>
  );
}
