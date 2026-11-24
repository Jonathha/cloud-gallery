import { useCallback, useLayoutEffect } from 'react';
import type { ChatMessage } from '../types';
import { INITIAL_VISIBLE, VISIBLE_STEP, type ChatListRefs } from './chatMessageListConfig';
import type { useChatWindowRange } from './useChatWindowRange';

interface Params {
  win: ReturnType<typeof useChatWindowRange>;
  refs: ChatListRefs;
  messages: ChatMessage[];
}

export function useChatWindowReveal({ win, refs, messages }: Params) {
  const { setWindowStartId, windowStartRef, messagesRef, pendingPrependRef, pendingRevealRef, extendingRef } = win;
  const { scrollContainerRef } = refs;

  // Mostra mais 10 mensagens já carregadas, guardando a posição de rolagem para aplicar após o render
  const extendWindow = useCallback((): boolean => {
    const el = scrollContainerRef.current;
    const msgs = messagesRef.current;
    const current = windowStartRef.current;
    const idx = current ? msgs.findIndex(m => m.id === current) : Math.max(0, msgs.length - INITIAL_VISIBLE);
    if (!el || idx <= 0) return false;
    pendingPrependRef.current = { height: el.scrollHeight, top: el.scrollTop };
    setWindowStartId(msgs[Math.max(0, idx - VISIBLE_STEP)].id);
    return true;
  }, []);

  // Mensagens antigas chegaram do servidor: agora é possível mostrá-las
  useLayoutEffect(() => {
    if (!pendingRevealRef.current) return;
    pendingRevealRef.current = false;
    if (!extendWindow()) extendingRef.current = false;
  }, [messages, extendWindow]);

  return { extendWindow };
}
