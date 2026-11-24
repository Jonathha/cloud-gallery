import { authPrimary } from '../../../firebase';
import { getApiUrl } from '../../../utils/apiUrl';
import { ChatMessage, ChatProfile } from '../types';
import { buildOptimisticTextMessage } from './messageSendTextPayload';

export async function sendTextMessage(
  text: string, replyTo: ChatMessage | undefined, profile: ChatProfile, messages: ChatMessage[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>, saveCache: (items: ChatMessage[]) => void
): Promise<void> {
  const cleanText = text.trim();
  if ([...cleanText].length > 3000) throw new Error('A mensagem excede o limite máximo de 3.000 caracteres.');
  const msgId = crypto.randomUUID();
  const now = Date.now();
  const sendStartTime = performance.now();

  const validReply = replyTo?.id && messages.some(m => m.id === replyTo.id && !m.hasError) ? replyTo : undefined;
  const { optimisticMsg, body, replyPlainText } = buildOptimisticTextMessage(
    msgId, authPrimary.currentUser!.uid, profile, cleanText, validReply, now
  );

  setMessages(prev => {
    const filtered = prev.filter(m => !(m.hasError && (m.decryptedText === cleanText || m.text === cleanText)));
    const next = [...filtered, optimisticMsg];
    saveCache(next);
    return next;
  });

  try {
    const token = await authPrimary.currentUser!.getIdToken();
    const res = await fetch(getApiUrl('/api/chat/messages'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.message) {
      throw new Error(data.error || (res.status === 429 ? 'Limite de envios atingido (20 mensagens em 3 min).' : 'Falha ao enviar mensagem.'));
    }
    const durationMs = Math.max(1, Math.round(performance.now() - sendStartTime));
    const serverMsg: ChatMessage = {
      ...data.message, id: data.message.id || msgId, text: cleanText, decryptedText: cleanText,
      replyToText: replyPlainText, decryptedReplyTo: replyPlainText, sendDurationMs: durationMs, isPending: false, hasError: false
    };
    setMessages(prev => { const next = prev.map(m => m.id === msgId ? serverMsg : m); saveCache(next); return next; });
  } catch (err: any) {
    console.error('[useChatMessages] Send error:', err);
    setMessages(prev => {
      const next = prev.map(m => m.id === msgId ? { ...m, isPending: false, hasError: true, errorText: err?.message || 'Limite de envios atingido' } : m);
      saveCache(next);
      return next;
    });
    throw err;
  }
}
