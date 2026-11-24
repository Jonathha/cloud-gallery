import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatProfile } from '../types';
import { loadCache, saveCache, timestamp } from './messagesCache';
import { fetchRemoteMessages } from './messagesFetcher';
import { reconcileMessages, mergeOlderMessages } from './messagesReconcile';

/**
 * Handles message polling interval, initial cache hydration, remote synchronization
 * and on-demand loading of older pages
 */
export function useChatPolling(chatKey: CryptoKey | null, profile: ChatProfile | null) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadCache());
  const [loadingMessages, setLoadingMessages] = useState(() => messages.length === 0);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const pollingInFlightRef = useRef(false);
  const olderInFlightRef = useRef(false);
  const olderLoadedRef = useRef(false);
  const hasMoreRef = useRef(true);

  const updateHasMore = (value: boolean) => {
    hasMoreRef.current = value;
    setHasMoreOlder(value);
  };

  const loadMessages = useCallback(async () => {
    if (!chatKey || !profile || pollingInFlightRef.current) return;
    pollingInFlightRef.current = true;
    try {
      const { messages: list, hasMore } = await fetchRemoteMessages(chatKey);
      // Depois que o usuário carregou páginas antigas, quem decide o hasMore é a última página antiga
      if (!olderLoadedRef.current) updateHasMore(hasMore);
      if (list.length > 0 && typeof window !== 'undefined') {
        const seenIds = list.map(m => m.id).filter(Boolean);
        if (seenIds.length > 0) {
          window.dispatchEvent(new CustomEvent('cg_chat_messages_seen', { detail: seenIds }));
        }
      }
      setMessages(prev => {
        const merged = reconcileMessages(prev, list, hasMore);
        if (merged !== prev) saveCache(merged);
        return merged;
      });
    } catch (err) {
      console.error('[useChatMessages] Load error:', err);
    } finally {
      pollingInFlightRef.current = false;
      setLoadingMessages(false);
    }
  }, [chatKey, profile]);

  /** Carrega a página imediatamente anterior à mensagem mais antiga já carregada. Retorna quantas entraram. */
  const loadOlder = useCallback(async (): Promise<number> => {
    if (!chatKey || !profile || olderInFlightRef.current || !hasMoreRef.current) return 0;
    const confirmed = messagesRef.current.filter(m => !m.isPending && !m.hasError);
    if (confirmed.length === 0) return 0;
    const oldest = confirmed.reduce((a, b) => (timestamp(b.createdAt) < timestamp(a.createdAt) ? b : a));

    olderInFlightRef.current = true;
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore } = await fetchRemoteMessages(chatKey, {
        createdAt: timestamp(oldest.createdAt),
        id: oldest.id
      });
      olderLoadedRef.current = true;
      updateHasMore(hasMore);
      const before = new Set(messagesRef.current.map(m => m.id));
      const added = older.filter(m => !before.has(m.id)).length;
      setMessages(prev => {
        const merged = mergeOlderMessages(prev, older);
        if (merged !== prev) saveCache(merged);
        return merged;
      });
      return added;
    } catch (err) {
      console.error('[useChatMessages] Load older error:', err);
      return 0;
    } finally {
      olderInFlightRef.current = false;
      setLoadingOlder(false);
    }
  }, [chatKey, profile]);

  useEffect(() => {
    if (!chatKey || !profile) return;
    loadMessages();
    const interval = window.setInterval(loadMessages, 1500);
    return () => window.clearInterval(interval);
  }, [chatKey, profile, loadMessages]);

  return { messages, setMessages, loadingMessages, loadMessages, hasMoreOlder, loadingOlder, loadOlder };
}
