import { useEffect, useLayoutEffect } from 'react';
import type { ChatMessage } from '../types';
import { VISIBLE_STEP, TOP_TRIGGER_PX, LOAD_RETRY_COOLDOWN_MS } from './chatMessageListConfig';
import type { ChatListRefs } from './chatMessageListConfig';
import type { useChatWindowRange } from './useChatWindowRange';

interface Params {
  win: ReturnType<typeof useChatWindowRange>;
  refs: ChatListRefs;
  revealMore: () => void;
  messages: ChatMessage[];
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder?: () => Promise<number>;
}

export function useChatOlderPreload({ win, refs, revealMore, messages, hasMoreOlder, loadingOlder, onLoadOlder }: Params) {
  const { windowStartId, pendingPrependRef, extendingRef, lastFailedLoadRef, hiddenCount } = win;
  const { scrollContainerRef, isInitialScrollDone } = refs;

  // Mantém a mesma mensagem na tela quando itens são inseridos acima dela
  useLayoutEffect(() => {
    const p = pendingPrependRef.current;
    const el = scrollContainerRef.current;
    if (!p || !el) return;
    el.scrollTop = p.top + (el.scrollHeight - p.height);
    pendingPrependRef.current = null;
    extendingRef.current = false;
  }, [windowStartId]);

  // Se o topo está visível (ou o conteúdo não enche a tela), revela mais; evita lista "curta demais" sem rolagem
  useEffect(() => {
    if (!isInitialScrollDone.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop < TOP_TRIGGER_PX || el.scrollHeight <= el.clientHeight + 8) revealMore();
  }, [messages, windowStartId, hasMoreOlder, loadingOlder, revealMore]);

  // Pré-carrega as antigas antes de o usuário chegar nelas, para a rolagem ser contínua
  useEffect(() => {
    if (!isInitialScrollDone.current || !hasMoreOlder || loadingOlder || !onLoadOlder) return;
    if (hiddenCount > VISIBLE_STEP) return;
    if (Date.now() - lastFailedLoadRef.current < LOAD_RETRY_COOLDOWN_MS) return;
    onLoadOlder().then(added => {
      if (added === 0) lastFailedLoadRef.current = Date.now();
    }).catch(() => { lastFailedLoadRef.current = Date.now(); });
  }, [hiddenCount, hasMoreOlder, loadingOlder, onLoadOlder, messages.length]);
}
