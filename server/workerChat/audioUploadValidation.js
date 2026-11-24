import { readWavDuration } from "./wavDuration.js";

export const MAX_AUDIO_BYTES = 3 * 1024 * 1024; // 3 MB
export const MAX_AUDIO_DURATION_MS = 180 * 1000; // 180 segundos (3 minutos)

/**
 * Validates request headers, buffer boundaries, and audio duration
 */
export function validateAudioUploadPayload(request, bytes) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!/^audio\/wav(?:;|$)/i.test(contentType.trim())) {
    return { error: "Somente áudio WAV é aceito.", status: 415 };
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength && declaredLength > MAX_AUDIO_BYTES) {
    return { error: "O áudio excede o limite máximo de 3 MB.", status: 413 };
  }

  if (bytes.length < 44 || bytes.length > MAX_AUDIO_BYTES) {
    return { error: "Arquivo de áudio inválido ou superior a 3 MB.", status: 400 };
  }

  const durationMs = readWavDuration(bytes);
  if (durationMs < 1000) {
    return { error: "O áudio precisa ter pelo menos 1 segundo.", status: 400 };
  }
  if (durationMs > MAX_AUDIO_DURATION_MS) {
    return { error: "A duração do áudio excede o limite máximo de 3 minutos (180 segundos).", status: 400 };
  }

  return { durationMs, error: null };
}
