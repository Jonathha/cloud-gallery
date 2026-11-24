import { ChatMessage } from '../types';

/**
 * Storage key for persisting unencrypted and decrypted chat messages
 */
export const CHAT_CACHE_KEY = 'cg_chat_messages_cache_v1';
export let memoryChatCache: ChatMessage[] = [];

/** Só as mensagens mais recentes vão para o localStorage: abertura rápida e sem estourar a cota. */
const PERSISTED_CACHE_LIMIT = 23;

/**
 * Normalizes Firestore / ISO / number timestamp to unix milliseconds
 */
export function timestamp(v: any): number {
  if (typeof v === 'number') return v;
  if (v?.seconds !== undefined) return Number(v.seconds) * 1000 + Number(v.nanoseconds || 0) / 1e6;
  return Date.parse(v) || 0;
}

export function saveCache(items: ChatMessage[]): void {
  memoryChatCache = items;
  try {
    const persistable = items.filter(m => !m.hasError && !m.isPending);
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(persistable.slice(-PERSISTED_CACHE_LIMIT)));
  } catch {}
}

export function loadCache(): ChatMessage[] {
  if (memoryChatCache.length) {
    return memoryChatCache.filter(m => !m.hasError && !m.isPending);
  }
  try {
    const value = JSON.parse(localStorage.getItem(CHAT_CACHE_KEY) || '[]');
    if (Array.isArray(value)) {
      memoryChatCache = value.filter(m => !m.hasError && !m.isPending).slice(-PERSISTED_CACHE_LIMIT);
    }
  } catch {}
  return memoryChatCache;
}
