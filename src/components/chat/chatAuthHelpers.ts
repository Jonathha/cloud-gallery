import { deriveKey } from '../../utils/crypto';
import { getApiUrl } from '../../utils/apiUrl';
import { ChatProfile } from './types';

export const SHARED_PASS = "CHAT_GLOBAL_SECRET_KEY_123";
export const SHARED_SALT = "Y2hhdF9nbG9iYWxfc2FsdF8xMjM=";

export function getCachedProfile(user: any): ChatProfile | null {
  if (!user) return null;
  try {
    const cached = localStorage.getItem(`chat_prof_${user.uid}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function saveCachedProfile(user: any, profile: ChatProfile): void {
  if (!user || !profile) return;
  try {
    localStorage.setItem(`chat_prof_${user.uid}`, JSON.stringify(profile));
  } catch {}
}

export async function fetchRemoteProfile(user: any): Promise<ChatProfile | null> {
  const idToken = await user.getIdToken();
  const res = await fetch(getApiUrl('/api/chat/profile'), {
    headers: { Authorization: 'Bearer ' + idToken }
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success && data.profile) {
    return data.profile;
  }
  return null;
}

export async function getDerivedChatKey(): Promise<CryptoKey> {
  return await deriveKey(SHARED_PASS, SHARED_SALT);
}
