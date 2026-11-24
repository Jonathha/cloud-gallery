import { useEffect } from 'react';
import { User } from 'firebase/auth';

interface ProtectedListenerParams {
  user: User | null;
  extraPassword: string | null | undefined;
  cryptoKey: CryptoKey | null | undefined;
  isUnlocked: boolean;
  onRefresh: () => void;
}

/**
 * Hook para escutar eventos globais de atualização da galeria protegida
 */
export function useProtectedRefreshListener({
  user,
  extraPassword,
  cryptoKey,
  isUnlocked,
  onRefresh
}: ProtectedListenerParams): void {
  useEffect(() => {
    if (!user || !extraPassword || !cryptoKey || !isUnlocked) return;
    onRefresh();

    const handleRefresh = () => {
      onRefresh();
    };

    window.addEventListener('refresh-protected-gallery', handleRefresh);
    return () => {
      window.removeEventListener('refresh-protected-gallery', handleRefresh);
    };
  }, [user, extraPassword, cryptoKey, isUnlocked, onRefresh]);
}
