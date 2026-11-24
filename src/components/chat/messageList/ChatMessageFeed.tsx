import ChatMessageRows from './ChatMessageRows';
import type { ChatMessageListController } from './useChatMessageListController';

export default function ChatMessageFeed({ c }: { c: ChatMessageListController }) {
  const { scrollContainerRef, messagesEndRef, spacerRef } = c.refs;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={c.scroll.handleScroll}
      className="flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pt-4 pb-2"
      style={{ overflowAnchor: 'none' }}
      id="chat-messages-scroll-feed"
    >
      <ChatMessageRows c={c} />
      <div ref={messagesEndRef} />
      <div ref={spacerRef} aria-hidden="true" style={{ height: 'var(--chat-input-h, calc(env(safe-area-inset-bottom,0px) + 5.5rem))' }} />
    </div>
  );
}
