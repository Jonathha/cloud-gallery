import { ChatMessage } from '../types';
import { timestamp } from './messagesCache';

/**
 * Reconciles server messages with optimistic local items preserving stability
 */
export function reconcileMessages(prev: ChatMessage[], list: ChatMessage[], hasMore = false): ChatMessage[] {
  const prevMap = new Map(prev.map(m => [m.id, m]));
  const serverIds = new Set(list.map(m => m.id));

  const reconciledList = list.map(serverMsg => {
    const local = prevMap.get(serverMsg.id);
    if (local) {
      return {
        ...serverMsg,
        decryptedText: local.decryptedText || serverMsg.decryptedText || serverMsg.text,
        decryptedReplyTo: local.decryptedReplyTo || serverMsg.decryptedReplyTo || serverMsg.replyToText,
        audioUrl: (local.audioUrl && !local.audioUrl.startsWith('blob:')) ? local.audioUrl : serverMsg.audioUrl,
        sendDurationMs: local.sendDurationMs || serverMsg.sendDurationMs,
      };
    }
    return serverMsg;
  });

  const pendingOptimistic = prev.filter(m => (m.isPending || m.hasError) && !serverIds.has(m.id));

  // O servidor só devolve a janela mais recente. Se há mais mensagens, as já carregadas
  // que são mais antigas que a janela continuam válidas e não podem ser descartadas.
  let olderLoaded: ChatMessage[] = [];
  if (hasMore && list.length > 0) {
    const windowStart = Math.min(...list.map(m => timestamp(m.createdAt)));
    olderLoaded = prev.filter(m => !m.isPending && !m.hasError && !serverIds.has(m.id) && timestamp(m.createdAt) < windowStart);
  }
  const merged = [...olderLoaded, ...reconciledList, ...pendingOptimistic];
  merged.sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt));

  if (prev.length === merged.length) {
    const isIdentical = prev.every((m, idx) => {
      const next = merged[idx];
      return m.id === next.id &&
             m.isPending === next.isPending &&
             m.hasError === next.hasError &&
             m.decryptedText === next.decryptedText &&
             m.sendDurationMs === next.sendDurationMs &&
             !(m.audioUrl?.startsWith('blob:') && !next.audioUrl?.startsWith('blob:'));
    });
    if (isIdentical) {
      return prev;
    }
  }

  return merged;
}

/**
 * Junta uma página de mensagens antigas às já carregadas (sem duplicar, ordenado por data).
 */
export function mergeOlderMessages(prev: ChatMessage[], older: ChatMessage[]): ChatMessage[] {
  const known = new Set(prev.map(m => m.id));
  const fresh = older.filter(m => !known.has(m.id));
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh].sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt));
}
