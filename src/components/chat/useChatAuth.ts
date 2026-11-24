import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/apiUrl';
import { ChatProfile } from './types';
import {
  getCachedProfile,
  saveCachedProfile,
  fetchRemoteProfile,
  getDerivedChatKey
} from './chatAuthHelpers';

export function useChatAuth(user: any) {
  const [chatKey, setChatKey] = useState<CryptoKey | null>(null);
  const [profile, setProfile] = useState<ChatProfile | null>(() => getCachedProfile(user));
  const [loading, setLoading] = useState(() => !profile);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!user) return;
      try {
        setLoading(true);
        const derivedKey = await getDerivedChatKey();
        if (!cancelled) setChatKey(derivedKey);

        const remote = await fetchRemoteProfile(user);
        if (remote && !cancelled) {
          setProfile(remote);
          saveCachedProfile(user, remote);
        }
      } catch (err) {
        console.error('[useChatAuth] Chat initialization failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [user]);

  const registerProfile = async (nickname: string) => {
    if (!user) throw new Error('Não autenticado');
    setRegistering(true);
    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch(getApiUrl('/api/chat/profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ username: nickname })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao cadastrar perfil.');
      const newProfile: ChatProfile = data.profile;
      setProfile(newProfile);
      saveCachedProfile(user, newProfile);
    } finally {
      setRegistering(false);
    }
  };

  return { chatKey, profile, loading: loading && !profile, registering, registerProfile };
}

export default useChatAuth;
