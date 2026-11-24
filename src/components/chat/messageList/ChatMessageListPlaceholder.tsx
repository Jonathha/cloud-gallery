import { ChatLoadingState, ChatEmptyState } from '../ChatEmptyState';

export default function ChatMessageListPlaceholder({ loading }: { loading: boolean }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {loading ? <ChatLoadingState /> : <ChatEmptyState />}
    </div>
  );
}
