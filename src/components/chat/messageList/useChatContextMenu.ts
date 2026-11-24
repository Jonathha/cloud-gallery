import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types';
import type { useChatBatchSelection } from './useChatBatchSelection';

export interface ChatContextMenuState {
  message: ChatMessage;
  anchor: HTMLElement;
}

export function useChatContextMenu(selection: ReturnType<typeof useChatBatchSelection>) {
  const { setIsSelectionMode, setSelectedMessageIds } = selection;
  const [menu, setMenu] = useState<ChatContextMenuState | null>(null);

  const openMenu = useCallback((msg: ChatMessage, anchor: HTMLElement) => {
    // Mesmo item já aberto: mantém o estado (evita reabrir ao disparar contextmenu após o toque longo)
    setMenu(prev => (prev && prev.message.id === msg.id ? prev : { message: msg, anchor }));
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  // Admin segurando por 3 s: fecha o menu e entra no modo de seleção com a ação "Excluir"
  const onAdminLongHold = useCallback((msg: ChatMessage) => {
    setMenu(null);
    setIsSelectionMode(true);
    setSelectedMessageIds(new Set([msg.id]));
  }, [setIsSelectionMode, setSelectedMessageIds]);

  return { menu, openMenu, closeMenu, onAdminLongHold };
}
