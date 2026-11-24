import type { RefObject } from 'react';
import type { ChatMessage } from '../types';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  loadingMessages: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  onReplyMessage?: (msg: ChatMessage) => void;
  onDeleteMessage?: (messageId: string) => Promise<boolean | void>;
  onDeleteMessages?: (messageIds: string[]) => Promise<boolean | void>;
  onRetryFailedMessage?: (msg: ChatMessage) => void;
  onDismissFailedMessage?: (messageId: string) => void;
  hasMoreOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => Promise<number>;
}

export interface ChatListRefs {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  spacerRef: RefObject<HTMLDivElement | null>;
  isInitialScrollDone: RefObject<boolean>;
  isNearBottomRef: RefObject<boolean>;
  lastClientHeightRef: RefObject<number>;
  prevLastMsgIdRef: RefObject<string | null>;
}

export const INITIAL_VISIBLE = 10;
export const VISIBLE_STEP = 10;
export const TOP_TRIGGER_PX = 80;
export const LOAD_RETRY_COOLDOWN_MS = 3000;
