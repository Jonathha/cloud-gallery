import React from 'react';
import ChatMessageItem from '../ChatMessageItem';
import { getMessageRowInfo } from './chatMessageRowInfo';
import type { ChatMessageListController } from './useChatMessageListController';

export default function ChatMessageRows({ c }: { c: ChatMessageListController }) {
  const { currentUserId, isAdmin, onReplyMessage, onRetryFailedMessage, onDismissFailedMessage } = c.props;
  const { isSelectionMode, selectedMessageIds, handleToggleSelect } = c.selection;
  const messages = c.win.visibleMessages;

  return (
    <>
      {messages.map((msg, index) => {
        const { showSeparator, timeLabel, isFirstInGroup, isLastInGroup, clusterSpacing } = getMessageRowInfo(messages, index);

        return (
          <React.Fragment key={msg.id}>
            {showSeparator && timeLabel && (
              <div className="w-full flex items-center justify-center my-3 select-none pointer-events-none">
                <span className="text-[10.5px] font-medium text-zinc-400/90 bg-zinc-900/80 border border-white/[0.08] rounded-full px-3 py-0.5 backdrop-blur-md shadow-sm">
                  {timeLabel}
                </span>
              </div>
            )}
            <div className={clusterSpacing}>
              <ChatMessageItem
                msg={msg}
                isMe={msg.userId === currentUserId}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                onReplyMessage={onReplyMessage}
                onHoldMessage={c.menu.openMenu}
                onAdminLongHold={c.menu.onAdminLongHold}
                onUrlClick={c.modals.handleUrlClick}
                isAdmin={isAdmin}
                isSelectionMode={isSelectionMode}
                isSelected={selectedMessageIds.has(msg.id)}
                onToggleSelect={handleToggleSelect}
                onRetryFailedMessage={onRetryFailedMessage}
                onDismissFailedMessage={onDismissFailedMessage}
              />
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
}
