import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types';
import type { ChatMessageListProps } from './chatMessageListConfig';

interface Params {
  onDeleteMessage?: ChatMessageListProps['onDeleteMessage'];
}

export function useChatMessageModals({ onDeleteMessage }: Params) {
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  const handleUrlClick = useCallback((url: string) => {
    setPendingExternalUrl(url);
  }, []);

  const handleOpenExternal = () => {
    if (pendingExternalUrl) {
      window.open(pendingExternalUrl, '_blank', 'noopener,noreferrer');
      setPendingExternalUrl(null);
    }
  };

  const handleConfirmAdminDelete = async (messageId: string) => {
    if (onDeleteMessage) {
      await onDeleteMessage(messageId);
    }
  };

  return {
    pendingExternalUrl,
    setPendingExternalUrl,
    selectedMessage,
    setSelectedMessage,
    handleUrlClick,
    handleOpenExternal,
    handleConfirmAdminDelete,
  };
}
