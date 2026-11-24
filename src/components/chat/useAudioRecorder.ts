import { useState, useRef, useEffect } from 'react';
import { audioBufferToWav, pickVoiceChannel } from './audioWavEncoder';

export const MAX_RECORDING_SECONDS = 180;
export const RECORDING_WARNING_SECONDS = 170;

// Cada etapa da conversão (decodificar / renderizar) tem limite de tempo: se algum navegador
// deixar a promise pendurada, a tela não fica presa em "Processando áudio…" para sempre.
const PROCESSING_STEP_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

function micErrorMessage(err: any): string {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Permissão do microfone negada. Libere o acesso nas configurações do navegador.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Nenhum microfone encontrado neste dispositivo.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Não foi possível usar o microfone. Ele pode estar em uso por outro app.';
    case 'SecurityError':
      return 'O microfone só funciona em conexão segura (HTTPS).';
    default:
      return 'Não foi possível acessar o microfone.';
  }
}

export function useAudioRecorder(
  onSendAudio: (blob: Blob, durationMs: number) => Promise<void>
) {
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // Stream do microfone enquanto grava (usado só para desenhar a onda sonora)
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [processing, setProcessing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  // Gravação interrompida (ligação, troca de app...) cujo conteúdo foi guardado para o usuário decidir.
  const [interrupted, setInterrupted] = useState<{ seconds: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const muteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRecordingRef = useRef<(send: boolean) => void>(() => {});
  // Id da conversão em andamento: cancelar (ou iniciar outra) invalida resultados atrasados.
  const processingRunRef = useRef(0);
  const interruptedDataRef = useRef<{ chunks: Blob[]; mimeType: string } | null>(null);
  const recordingStartRef = useRef(0);

  const clearMuteTimer = () => {
    if (muteTimerRef.current) {
      clearTimeout(muteTimerRef.current);
      muteTimerRef.current = null;
    }
  };

  // Converte (decodifica, reamostra, normaliza → WAV) e envia. Cada execução tem um id:
  // se o usuário cancelar, o resultado atrasado é ignorado.
  const processAndSend = async (chunks: Blob[], mimeType: string, runId: number) => {
    const isCurrent = () => processingRunRef.current === runId;
    if (!isCurrent()) return;

    let result: { wavBlob: Blob; durationMs: number } | null = null;
    try {
      const rawBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
      if (!chunks.length || rawBlob.size < 100) {
        if (isCurrent()) setAudioError('O áudio precisa ter pelo menos 1 segundo.');
        return;
      }

      const arrayBuf = await rawBlob.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await withTimeout(ctx.decodeAudioData(arrayBuf), PROCESSING_STEP_TIMEOUT_MS, 'Tempo esgotado ao decodificar o áudio.');
      } finally {
        // Sem await: em alguns navegadores close() pode nunca resolver e prenderia a tela.
        try { Promise.resolve(ctx.close()).catch(() => {}); } catch { /* ignora */ }
      }

      // Limita a duração máxima a 180 segundos (3 minutos)
      const maxDurationSec = MAX_RECORDING_SECONDS;
      const actualDurationSec = Math.min(audioBuffer.duration, maxDurationSec);
      if (actualDurationSec < 1) {
        if (isCurrent()) setAudioError('O áudio precisa ter pelo menos 1 segundo.');
        return;
      }

      // Resample mono para garantir que até 3 minutos caibam estritamente no limite de 3 MB
      const targetSampleRate = actualDurationSec > 90 ? 8000 : 16000;
      const targetLength = Math.max(1, Math.round(actualDurationSec * targetSampleRate));
      const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);

      const source = offlineCtx.createBufferSource();

      // Se o microfone de voz estiver só em um canal (o outro mudo), usa esse canal
      // em vez de deixar o downmix do navegador diluir a voz.
      const voiceChannel = pickVoiceChannel(audioBuffer);
      if (voiceChannel) {
        const monoBuffer = offlineCtx.createBuffer(1, voiceChannel.length, audioBuffer.sampleRate);
        monoBuffer.getChannelData(0).set(voiceChannel);
        source.buffer = monoBuffer;
      } else {
        source.buffer = audioBuffer;
      }

      // Filtro passa-alta suave (80Hz) para eliminar ruídos graves de fundo (ventoinhas/ar-condicionado)
      let lastNode: AudioNode = source;
      if (offlineCtx.createBiquadFilter) {
        try {
          const highPass = offlineCtx.createBiquadFilter();
          highPass.type = 'highpass';
          highPass.frequency.value = 80;
          source.connect(highPass);
          lastNode = highPass;
        } catch (filterErr) {
          console.warn('[useAudioRecorder] High-pass filter fallback:', filterErr);
        }
      }

      lastNode.connect(offlineCtx.destination);
      source.start(0);

      const renderedBuffer = await withTimeout(offlineCtx.startRendering(), PROCESSING_STEP_TIMEOUT_MS, 'Tempo esgotado ao processar o áudio.');
      const durationMs = Math.max(1000, Math.min(maxDurationSec * 1000, Math.round(renderedBuffer.duration * 1000)));

      result = { wavBlob: audioBufferToWav(renderedBuffer), durationMs };
    } catch (err: any) {
      if (isCurrent()) {
        console.error('[useAudioRecorder] Audio processing error:', err);
        setAudioError('Não foi possível processar o áudio gravado. Tente gravar novamente.');
      }
      return;
    } finally {
      if (isCurrent()) setProcessing(false);
    }

    if (!isCurrent()) return; // cancelado enquanto processava: não envia

    // O envio roda em segundo plano: o microfone e o campo de texto ficam livres
    // enquanto o áudio sobe (a mensagem já aparece como "pendente" na lista).
    onSendAudio(result.wavBlob, result.durationMs).catch((err: any) => {
      console.error('[useAudioRecorder] Audio send error:', err);
      setAudioError(err?.message || 'Falha ao enviar áudio. Tente novamente.');
    });
  };

  // Sai da tela "Processando áudio…" (ex.: conversão travada) sem enviar nada.
  const cancelProcessing = () => {
    processingRunRef.current += 1;
    setProcessing(false);
  };

  // Envia o que foi gravado antes da interrupção (mesmo pipeline do envio normal).
  const sendInterrupted = () => {
    const data = interruptedDataRef.current;
    interruptedDataRef.current = null;
    setInterrupted(null);
    if (!data) return;
    setProcessing(true);
    setAudioError(null);
    const runId = ++processingRunRef.current;
    void processAndSend(data.chunks, data.mimeType, runId);
  };

  const discardInterrupted = () => {
    interruptedDataRef.current = null;
    setInterrupted(null);
  };

  const stopRecording = (send: boolean) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    clearMuteTimer();

    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;

    setRecording(false);
    setRecordingStream(null);
    setRecordingSeconds(0);

    if (!recorder || recorder.state === 'inactive') {
      if (stream) stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      return;
    }

    if (!send) {
      recorder.onstop = null;
      recorder.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      return;
    }

    // "processing" liga já aqui (e não só no onstop) para a barra de gravação
    // continuar na tela mostrando "Processando áudio…" sem piscar.
    setProcessing(true);
    setAudioError(null);
    const runId = ++processingRunRef.current;

    recorder.onstop = async () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];
      await processAndSend(chunks, recorder.mimeType, runId);
    };

    recorder.stop();
  };

  stopRecordingRef.current = stopRecording;

  const startRecording = async () => {
    if (processing || recording || interrupted) return;
    setAudioError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioError(
        window.isSecureContext === false
          ? 'O microfone só funciona em conexão segura (HTTPS).'
          : 'Seu navegador não suporta gravação de áudio.'
      );
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setAudioError('Seu navegador não suporta gravação de áudio.');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      const options = MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? { mimeType: 'audio/mp4' }
          : undefined;

      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      // Ligação, troca de app ou microfone tomado por outro app: para a gravação e, em vez de
      // jogar fora tudo que já foi gravado, guarda os pedaços para o usuário enviar ou descartar.
      const handleInterruption = () => {
        if (mediaRecorderRef.current !== recorder) return;
        const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000);
        // Mantém a mesma lista: um último pedaço que chegue atrasado cai nela.
        const chunks = audioChunksRef.current;
        const activeStream = streamRef.current;

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        clearMuteTimer();

        recorder.onstop = null;
        if (recorder.state !== 'inactive') {
          try { recorder.stop(); } catch { /* já parou */ }
        }
        if (activeStream) activeStream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);
        setRecordingStream(null);
        setRecordingSeconds(0);

        if (elapsed >= 1 && chunks.length) {
          interruptedDataRef.current = { chunks, mimeType: recorder.mimeType };
          setInterrupted({ seconds: elapsed });
        } else {
          setAudioError('A gravação foi interrompida (ligação ou troca de app). Grave novamente.');
        }
      };
      recorder.onerror = handleInterruption;
      stream.getAudioTracks().forEach(track => {
        track.onended = handleInterruption;
        // "mute" pode ser um soluço rápido: só considera interrupção se durar mais de 1,5s
        track.onmute = () => {
          clearMuteTimer();
          muteTimerRef.current = setTimeout(handleInterruption, 1500);
        };
        track.onunmute = clearMuteTimer;
      });

      recorder.start(250);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingStream(stream);
      setRecordingSeconds(0);

      const startTime = Date.now();
      recordingStartRef.current = startTime;
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingSeconds(elapsed);
        // Capped em 3 minutos (180 segundos): encerra e envia automaticamente
        if (elapsed >= MAX_RECORDING_SECONDS) {
          stopRecordingRef.current(true);
        }
      }, 200);
    } catch (err: any) {
      console.error('[useAudioRecorder] Microphone access error:', err);
      // Se o microfone foi aberto mas algo falhou depois, solta o microfone (luz de gravação)
      if (stream) stream.getTracks().forEach(t => t.stop());
      setAudioError(micErrorMessage(err));
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    recording,
    recordingSeconds,
    recordingStream,
    processing,
    interrupted,
    audioError,
    clearAudioError: () => setAudioError(null),
    startRecording,
    stopRecording,
    cancelProcessing,
    sendInterrupted,
    discardInterrupted
  };
}
