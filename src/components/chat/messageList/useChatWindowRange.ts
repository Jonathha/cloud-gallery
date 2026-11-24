import { useState, useRef, useLayoutEffect } from 'react';
import type { ChatMessage } from '../types';
import { INITIAL_VISIBLE } from './chatMessageListConfig';

interface Params {
  messages: ChatMessage[];
  loadingMessages: boolean;
  hasMoreOlder: boolean;
  onLoadOlder?: () => Promise<number>;
}

export function useChatWindowRange({ messages, loadingMessages, hasMoreOlder, onLoadOlder }: Params) {
  // --- Janela de renderização: só as últimas 10 aparecem; as anteriores entram ao rolar para cima ---
  const [windowStartId, setWindowStartId] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const windowStartRef = useRef<string | null>(windowStartId);
  windowStartRef.current = windowStartId;
  const olderPropsRef = useRef({ hasMoreOlder, onLoadOlder });
  olderPropsRef.current = { hasMoreOlder, onLoadOlder };
  const pendingPrependRef = useRef<{ height: number; top: number } | null>(null);
  const pendingRevealRef = useRef(false);
  const extendingRef = useRef(false);
  const lastFailedLoadRef = useRef(0);

  const anchorIdx = windowStartId ? messages.findIndex(m => m.id === windowStartId) : -1;
  const startIdx = anchorIdx >= 0 ? anchorIdx : Math.max(0, messages.length - INITIAL_VISIBLE);
  const visibleMessages = startIdx > 0 ? messages.slice(startIdx) : messages;
  const hiddenCount = startIdx;

  // Fixa o início da janela para que novas mensagens não empurrem as visíveis
  useLayoutEffect(() => {
    if (windowStartId !== null || loadingMessages || messages.length === 0) return;
    setWindowStartId(messages[Math.max(0, messages.length - INITIAL_VISIBLE)].id);
  }, [windowStartId, loadingMessages, messages]);

  return {
    windowStartId,
    setWindowStartId,
    windowStartRef,
    messagesRef,
    olderPropsRef,
    pendingPrependRef,
    pendingRevealRef,
    extendingRef,
    lastFailedLoadRef,
    visibleMessages,
    hiddenCount,
  };
}
