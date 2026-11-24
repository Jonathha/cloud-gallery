import { useState } from 'react';
import type { ChatMessageListProps } from './chatMessageListConfig';
import type { useChatBatchSelection } from './useChatBatchSelection';

interface Params {
  selection: ReturnType<typeof useChatBatchSelection>;
  onDeleteMessage?: ChatMessageListProps['onDeleteMessage'];
  onDeleteMessages?: ChatMessageListProps['onDeleteMessages'];
}

export function useChatBatchDelete({ selection, onDeleteMessage, onDeleteMessages }: Params) {
  const { selectedMessageIds, setIsSelectionMode, setSelectedMessageIds } = selection;
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

  const handleBatchDelete = async () => {
    if (selectedMessageIds.size === 0 || isBatchDeleting || !(onDeleteMessages || onDeleteMessage)) return;
    setIsBatchDeleting(true);
    setBatchDeleteError(null);
    try {
      const ids = Array.from(selectedMessageIds);
      if (onDeleteMessages) await onDeleteMessages(ids);
      else await Promise.all(ids.map(id => onDeleteMessage!(id)));
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
      setShowBatchDeleteConfirm(false);
    } catch (err: any) {
      setBatchDeleteError(err?.message || 'Falha ao excluir mensagens selecionadas.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return {
    showBatchDeleteConfirm,
    setShowBatchDeleteConfirm,
    isBatchDeleting,
    batchDeleteError,
    handleBatchDelete,
  };
}
