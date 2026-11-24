import { useEffect, useLayoutEffect } from 'react';
import type { ChatMessage } from '../types';
import type { ChatListRefs } from './chatMessageListConfig';

interface Params {
  refs: ChatListRefs;
  messages: ChatMessage[];
  loadingMessages: boolean;
  currentUserId?: string;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export function useChatScrollAnchor({ refs, messages, loadingMessages, currentUserId, scrollToBottom }: Params) {
  const { scrollContainerRef, isInitialScrollDone, isNearBottomRef, lastClientHeightRef, prevLastMsgIdRef } = refs;

  useLayoutEffect(() => {
    if (loadingMessages || messages.length === 0) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    if (!isInitialScrollDone.current) {
      el.scrollTop = el.scrollHeight;
      isInitialScrollDone.current = true;
      isNearBottomRef.current = true;
      prevLastMsgIdRef.current = messages[messages.length - 1]?.id || null;
      if (el.clientHeight > 0) {
        lastClientHeightRef.current = el.clientHeight;
      }
    }
  }, [messages, loadingMessages]);

  useEffect(() => {
    if (loadingMessages || messages.length === 0 || !isInitialScrollDone.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    const isNewMessage = lastMsg.id !== prevLastMsgIdRef.current;
    prevLastMsgIdRef.current = lastMsg.id;

    if (isNewMessage) {
      const isMyMsg = lastMsg.userId === currentUserId;
      if (isMyMsg || isNearBottomRef.current) {
        scrollToBottom('smooth');
      }
    }
  }, [messages, loadingMessages, currentUserId]);
}
