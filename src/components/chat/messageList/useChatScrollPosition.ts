import { useState } from 'react';
import { TOP_TRIGGER_PX } from './chatMessageListConfig';
import type { ChatListRefs } from './chatMessageListConfig';

interface Params {
  refs: ChatListRefs;
  revealMore: () => void;
}

export function useChatScrollPosition({ refs, revealMore }: Params) {
  const { scrollContainerRef, isNearBottomRef } = refs;
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior,
    });
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom <= 48;
    setShowScrollBottom(distanceToBottom > 160);
    if (el.scrollTop < TOP_TRIGGER_PX) revealMore();
  };

  return { showScrollBottom, setShowScrollBottom, scrollToBottom, handleScroll };
}
