import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types';

interface Params {
  isAdmin?: boolean;
  setSelectedMessage: (msg: ChatMessage | null) => void;
}

export function useChatBatchSelection({ isAdmin, setSelectedMessage }: Params) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const handleHoldMessage = useCallback((m: ChatMessage) => {
    if (isAdmin) {
      setIsSelectionMode(true);
      setSelectedMessageIds(new Set([m.id]));
    } else {
      setSelectedMessage(m);
    }
  }, [isAdmin, setSelectedMessage]);

  const handleToggleSelect = useCallback((m: ChatMessage) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  }, []);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  return {
    isSelectionMode,
    setIsSelectionMode,
    selectedMessageIds,
    setSelectedMessageIds,
    handleHoldMessage,
    handleToggleSelect,
    handleCancelSelection,
  };
}
