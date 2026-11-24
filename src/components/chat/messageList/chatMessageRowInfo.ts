import type { ChatMessage } from '../types';
import { shouldShowTimeSeparator, formatChatTimeSeparator } from '../chatTimeUtils';

export function getMessageRowInfo(list: ChatMessage[], index: number) {
  const msg = list[index];
  const prevMsg = index > 0 ? list[index - 1] : undefined;
  const nextMsg = index < list.length - 1 ? list[index + 1] : undefined;

  const showSeparator = shouldShowTimeSeparator(msg, prevMsg);
  const timeLabel = showSeparator ? formatChatTimeSeparator(msg.createdAt) : null;

  const nextHasSeparator = nextMsg ? shouldShowTimeSeparator(nextMsg, msg) : true;

  const isSameSenderAsPrev = !showSeparator && prevMsg?.userId === msg.userId;
  const isSameSenderAsNext = !nextHasSeparator && nextMsg?.userId === msg.userId;

  const isFirstInGroup = !isSameSenderAsPrev;
  const isLastInGroup = !isSameSenderAsNext;

  const clusterSpacing = showSeparator ? 'mt-1' : isFirstInGroup ? (index === 0 ? 'mt-0' : 'mt-3.5') : 'mt-1';

  return { showSeparator, timeLabel, isFirstInGroup, isLastInGroup, clusterSpacing };
}
