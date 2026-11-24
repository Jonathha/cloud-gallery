import { authPrimary } from '../../../firebase';
import { decryptData } from '../../../utils/crypto';
import { getApiUrl } from '../../../utils/apiUrl';
import { ChatMessage } from '../types';
import { memoryChatCache } from './messagesCache';

export const CHAT_PAGE_SIZE = 23;

export interface RemoteMessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

export async function fetchRemoteMessages(
  chatKey: CryptoKey,
  before?: { createdAt: number; id: string }
): Promise<RemoteMessagesPage> {
  if (!authPrimary.currentUser) return { messages: [], hasMore: false };
  const token = await authPrimary.currentUser.getIdToken();
  const params = new URLSearchParams({ limit: String(CHAT_PAGE_SIZE) });
  if (before) {
    params.set('before', String(before.createdAt));
    params.set('beforeId', before.id);
  }
  const res = await fetch(getApiUrl('/api/chat/messages?' + params.toString()), {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Falha ao carregar mensagens.');
  }

  const cache = new Map(memoryChatCache.map(m => [m.id, m]));
  const list: ChatMessage[] = (data.messages || []).map((raw: ChatMessage) => {
    const old = cache.get(raw.id);
    return old ? {
      ...raw,
      decryptedText: old.decryptedText || raw.text,
      decryptedReplyTo: old.decryptedReplyTo || raw.replyToText,
      sendDurationMs: old.sendDurationMs
    } : { ...raw };
  });

  for (const msg of list) {
    if (msg.text && !msg.decryptedText) {
      msg.decryptedText = msg.text;
    } else if (!msg.decryptedText && msg.mediaType === 'text' && msg.textCiphertext && msg.textIv) {
      try { msg.decryptedText = await decryptData(msg.textCiphertext, msg.textIv, chatKey); } catch { msg.decryptedText = '[Mensagem]'; }
    }

    if (msg.replyToText && !msg.decryptedReplyTo) {
      msg.decryptedReplyTo = msg.replyToText;
    } else if (!msg.decryptedReplyTo && msg.replyToCiphertext && msg.replyToIv) {
      try { msg.decryptedReplyTo = await decryptData(msg.replyToCiphertext, msg.replyToIv, chatKey); } catch { msg.decryptedReplyTo = '[Mensagem Original]'; }
    }
  }

  return { messages: list, hasMore: data.hasMore === true };
}
