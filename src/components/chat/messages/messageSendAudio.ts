import { authPrimary } from '../../../firebase';
import { getApiUrl } from '../../../utils/apiUrl';
import { ChatMessage, ChatProfile } from '../types';
import { buildOptimisticAudioMessage } from './messageSendAudioPayload';
import { memoryAudioCache } from '../audio/audioConstants';

const UPLOAD_TIMEOUT_MS = 45_000;
const CREATE_MESSAGE_TIMEOUT_MS = 25_000;

/**
 * fetch + leitura do JSON com limite de tempo. Sem isso, uma rede ruim (ou o servidor
 * esperando o lock do D1) deixava a bolha "enviando" para sempre.
 */
async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<{ res: Response; data: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Tempo esgotado ao enviar o áudio. Verifique a conexão e tente novamente.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendAudioMessage(
  blob: Blob, durationMs: number, replyTo: ChatMessage | undefined, profile: ChatProfile, messages: ChatMessage[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>, saveCache: (items: ChatMessage[]) => void,
  retryMsgId?: string
): Promise<void> {
  if (durationMs < 1000) throw new Error('O áudio precisa ter pelo menos 1 segundo.');
  if (durationMs > 180000) throw new Error('O áudio excede o limite máximo de 3 minutos (180 segundos).');
  if (blob.size > 3 * 1024 * 1024) throw new Error('O áudio excede o limite máximo de 3 MB.');

  // No reenvio reaproveita o id: o servidor faz upsert por id, então não duplica a mensagem.
  const msgId = retryMsgId || crypto.randomUUID();
  const localAudioUrl = URL.createObjectURL(blob);
  const now = Date.now();
  const sendStartTime = performance.now();

  const validReply = replyTo?.id && messages.some(m => m.id === replyTo.id && !m.hasError) ? replyTo : undefined;
  const { optimisticMsg, replyPlainText } = buildOptimisticAudioMessage(
    msgId, authPrimary.currentUser!.uid, profile, localAudioUrl, durationMs, blob.size, validReply, now
  );
  setMessages(prev => { const next = [...prev, optimisticMsg]; saveCache(next); return next; });

  try {
    const token = await authPrimary.currentUser!.getIdToken();
    const { res: upload, data: uploaded } = await fetchJsonWithTimeout(getApiUrl('/api/chat/media/upload'), { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'audio/wav' }, body: blob }, UPLOAD_TIMEOUT_MS);
    if (!upload.ok || !uploaded.success) throw new Error(uploaded.error || 'Falha ao enviar áudio.');

    const body: any = { id: msgId, mediaType: 'audio', audioUrl: uploaded.url, audioDurationMs: uploaded.durationMs, audioSize: uploaded.size, createdAt: now };
    if (validReply?.id) {
      body.replyToId = validReply.id; body.replyToUserName = validReply.userName; body.replyToText = replyPlainText;
      if (validReply.replyToCiphertext) body.replyToCiphertext = validReply.replyToCiphertext;
      if (validReply.replyToIv) body.replyToIv = validReply.replyToIv;
    }
    const { res, data } = await fetchJsonWithTimeout(getApiUrl('/api/chat/messages'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }, CREATE_MESSAGE_TIMEOUT_MS);
    if (!res.ok || !data.success || !data.message) throw new Error(data.error || 'Falha ao criar mensagem de áudio.');

    const duration = Math.max(1, Math.round(performance.now() - sendStartTime));
    const resolvedId = data.message.id || msgId;
    memoryAudioCache.set(resolvedId, localAudioUrl);
    const serverMsg: ChatMessage = { ...data.message, id: resolvedId, audioUrl: data.message.audioUrl || localAudioUrl, replyToText: replyPlainText, decryptedReplyTo: replyPlainText, sendDurationMs: duration, isPending: false, hasError: false };
    setMessages(prev => { const next = prev.map(m => m.id === msgId ? serverMsg : m); saveCache(next); return next; });
  } catch (err: any) {
    console.error('[useChatMessages] Send audio error:', err);
    setMessages(prev => {
      const next = prev.map(m => m.id === msgId ? { ...m, isPending: false, hasError: true, errorText: err?.message || 'Falha no envio do áudio.' } : m);
      saveCache(next); return next;
    });
    throw err;
  }
}
