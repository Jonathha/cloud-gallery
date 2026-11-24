import { useCallback } from 'react';
import { LOAD_RETRY_COOLDOWN_MS } from './chatMessageListConfig';
import type { useChatWindowRange } from './useChatWindowRange';

interface Params {
  win: ReturnType<typeof useChatWindowRange>;
  extendWindow: () => boolean;
}

export function useChatRevealMore({ win, extendWindow }: Params) {
  const { olderPropsRef, pendingRevealRef, extendingRef, lastFailedLoadRef } = win;

  const revealMore = useCallback(() => {
    if (extendingRef.current) return;
    extendingRef.current = true;
    if (extendWindow()) return;
    const { hasMoreOlder: more, onLoadOlder: load } = olderPropsRef.current;
    if (!more || !load || Date.now() - lastFailedLoadRef.current < LOAD_RETRY_COOLDOWN_MS) {
      extendingRef.current = false;
      return;
    }
    pendingRevealRef.current = true;
    load().then(added => {
      if (added === 0) {
        lastFailedLoadRef.current = Date.now();
        pendingRevealRef.current = false;
        extendingRef.current = false;
      }
    }).catch(() => {
      lastFailedLoadRef.current = Date.now();
      pendingRevealRef.current = false;
      extendingRef.current = false;
    });
  }, [extendWindow]);

  return { revealMore };
}
