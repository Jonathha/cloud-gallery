import { useRef } from 'react';
import type { ChatListRefs, ChatMessageListProps } from './chatMessageListConfig';
import { useChatWindowRange } from './useChatWindowRange';
import { useChatWindowReveal } from './useChatWindowReveal';
import { useChatRevealMore } from './useChatRevealMore';
import { useChatOlderPreload } from './useChatOlderPreload';
import { useChatScrollPosition } from './useChatScrollPosition';
import { useChatScrollResize } from './useChatScrollResize';
import { useChatScrollAnchor } from './useChatScrollAnchor';
import { useChatMessageModals } from './useChatMessageModals';
import { useChatBatchSelection } from './useChatBatchSelection';
import { useChatBatchDelete } from './useChatBatchDelete';
import { useChatContextMenu } from './useChatContextMenu';

export function useChatMessageListController(props: ChatMessageListProps) {
  const {
    messages, loadingMessages, currentUserId, isAdmin,
    hasMoreOlder = false, loadingOlder = false, onLoadOlder,
    onDeleteMessage, onDeleteMessages,
  } = props;

  const refs: ChatListRefs = {
    scrollContainerRef: useRef<HTMLDivElement>(null),
    messagesEndRef: useRef<HTMLDivElement>(null),
    spacerRef: useRef<HTMLDivElement>(null),
    isInitialScrollDone: useRef(false),
    isNearBottomRef: useRef(true),
    lastClientHeightRef: useRef(0),
    prevLastMsgIdRef: useRef<string | null>(null),
  };

  const win = useChatWindowRange({ messages, loadingMessages, hasMoreOlder, onLoadOlder });
  const { extendWindow } = useChatWindowReveal({ win, refs, messages });
  const { revealMore } = useChatRevealMore({ win, extendWindow });
  useChatOlderPreload({ win, refs, revealMore, messages, hasMoreOlder, loadingOlder, onLoadOlder });

  const scroll = useChatScrollPosition({ refs, revealMore });
  useChatScrollResize({ refs, messages, loadingMessages, setShowScrollBottom: scroll.setShowScrollBottom });
  useChatScrollAnchor({ refs, messages, loadingMessages, currentUserId, scrollToBottom: scroll.scrollToBottom });

  const modals = useChatMessageModals({ onDeleteMessage });
  const selection = useChatBatchSelection({ isAdmin, setSelectedMessage: modals.setSelectedMessage });
  const batch = useChatBatchDelete({ selection, onDeleteMessage, onDeleteMessages });

  const menu = useChatContextMenu(selection);

  return { props, refs, win, scroll, modals, selection, batch, menu };
}

export type ChatMessageListController = ReturnType<typeof useChatMessageListController>;
