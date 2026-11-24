import { ChatMessage } from './types';

/** Rótulo da citação quando a mensagem respondida é um áudio (não tem texto). */
export const REPLY_AUDIO_LABEL = 'Mensagem de voz';

function formatAudioDuration(ms?: number): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '';
  const total = Math.max(1, Math.round(ms / 1000));
  return ` (${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')})`;
}

/** Texto usado para citar uma mensagem ao respondê-la. */
export function getReplyPreviewText(msg: ChatMessage): string {
  const text = msg.decryptedText || msg.text || '';
  if (text) return text;
  return msg.mediaType === 'audio' ? REPLY_AUDIO_LABEL + formatAudioDuration(msg.audioDurationMs) : '';
}
