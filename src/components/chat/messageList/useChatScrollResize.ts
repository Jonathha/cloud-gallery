import { useEffect } from 'react';
import type { ChatMessage } from '../types';
import type { ChatListRefs } from './chatMessageListConfig';

interface Params {
  refs: ChatListRefs;
  messages: ChatMessage[];
  loadingMessages: boolean;
  setShowScrollBottom: (value: boolean) => void;
}

export function useChatScrollResize({ refs, messages, loadingMessages, setShowScrollBottom }: Params) {
  const { scrollContainerRef, spacerRef, isNearBottomRef, lastClientHeightRef } = refs;
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        if (lastClientHeightRef.current !== 0 && Math.abs(lastClientHeightRef.current - newHeight) > 10) {
          if (isNearBottomRef.current) {
            el.scrollTop = el.scrollHeight;
            setShowScrollBottom(false);
          }
        }
        if (newHeight > 0) {
          lastClientHeightRef.current = newHeight;
        }
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [loadingMessages, isEmpty]);

  // Se o campo de mensagem cresce/encolhe e o usuário está no fim, mantém o fim visível
  useEffect(() => {
    const el = scrollContainerRef.current;
    const spacer = spacerRef.current;
    if (!el || !spacer) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return; }
      if (isNearBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(spacer);
    return () => ro.disconnect();
  }, [loadingMessages, isEmpty]);
}
