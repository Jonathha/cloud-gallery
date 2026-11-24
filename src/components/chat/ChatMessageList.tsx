import { Loader2 } from 'lucide-react';
import ChatExternalLinkModal from './ChatExternalLinkModal';
import ChatMessageDetailsModal from './ChatMessageDetailsModal';
import type { ChatMessageListProps } from './messageList/chatMessageListConfig';
import { useChatMessageListController } from './messageList/useChatMessageListController';
import ChatMessageListPlaceholder from './messageList/ChatMessageListPlaceholder';
import ChatMessageFeed from './messageList/ChatMessageFeed';
import ChatBatchActionBar from './messageList/ChatBatchActionBar';
import ChatContextMenu from './messageList/ChatContextMenu';
import ChatBatchDeleteModal from './messageList/ChatBatchDeleteModal';
import ChatScrollBottomButton from './messageList/ChatScrollBottomButton';

export default function ChatMessageList(props: ChatMessageListProps) {
  const c = useChatMessageListController(props);
  const { modals } = c;

  if (c.props.loadingMessages || c.props.messages.length === 0) {
    return <ChatMessageListPlaceholder loading={c.props.loadingMessages} />;
  }

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden relative">
      <ChatMessageFeed c={c} />

      {c.props.loadingOlder && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-7 h-7 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        </div>
      )}

      <ChatContextMenu c={c} />
      <ChatBatchActionBar c={c} />
      <ChatBatchDeleteModal c={c} />
      <ChatScrollBottomButton c={c} />

      <ChatExternalLinkModal
        pendingExternalUrl={modals.pendingExternalUrl}
        onClose={() => modals.setPendingExternalUrl(null)}
        onConfirm={modals.handleOpenExternal}
      />

      <ChatMessageDetailsModal
        isOpen={!!modals.selectedMessage}
        message={modals.selectedMessage}
        currentUserId={c.props.currentUserId}
        isAdmin={c.props.isAdmin}
        onClose={() => modals.setSelectedMessage(null)}
        onReply={c.props.onReplyMessage}
        onDeleteMessage={modals.handleConfirmAdminDelete}
      />
    </div>
  );
}
