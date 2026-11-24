import { authPrimary } from '../../../firebase';
import { getApiUrl } from '../../../utils/apiUrl';
import { ChatMessage } from '../types';

/**
 * Calls delete API for chat message and updates local cache
 */
export async function deleteChatMessageApi(
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  saveCache: (items: ChatMessage[]) => void
): Promise<boolean> {
  if (!authPrimary.currentUser) return false;
  const token = await authPrimary.currentUser.getIdToken(true);
  const res = await fetch(getApiUrl('/api/chat/delete-message'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ messageId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao excluir mensagem.');

  setMessages(prev => {
    const next = prev.filter(m => m.id !== messageId);
    saveCache(next);
    return next;
  });
  return true;
}

const BATCH_DELETE_LIMIT = 100;

/**
 * Deletes several messages with one request per group of up to 100 ids
 */
export async function deleteChatMessagesBatchApi(
  messageIds: string[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  saveCache: (items: ChatMessage[]) => void
): Promise<boolean> {
  if (!authPrimary.currentUser || messageIds.length === 0) return false;
  const ids = Array.from(new Set(messageIds));
  for (let i = 0; i < ids.length; i += BATCH_DELETE_LIMIT) {
    const group = ids.slice(i, i + BATCH_DELETE_LIMIT);
    const token = await authPrimary.currentUser.getIdToken(true);
    const res = await fetch(getApiUrl('/api/chat/delete-messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ messageIds: group })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao excluir mensagens.');

    const removed = new Set(group);
    setMessages(prev => {
      const next = prev.filter(m => !removed.has(m.id));
      saveCache(next);
      return next;
    });
  }
  return true;
}

/**
 * Dismisses optimistic failed message from local view
 */
export function dismissFailedChatMessage(
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  saveCache: (items: ChatMessage[]) => void
): void {
  setMessages(prev => {
    const next = prev.filter(m => m.id !== messageId);
    saveCache(next);
    return next;
  });
}
