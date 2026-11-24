import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../utils/apiUrl';
import { ProtectedImageItem, UseProtectedImagesReturn } from './images/types';
import { processSingleProtectedImage } from './images/processProtectedList';
import { loadProtectedFullResolution } from './images/fullResolutionLoader';
import { useProtectedRefreshListener } from './images/useProtectedRefreshListener';

export function useProtectedImages(isUnlocked: boolean): UseProtectedImagesReturn {
  const { user, extraPassword, cryptoKey } = useAuth();
  const [images, setImages] = useState<ProtectedImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingFull, setDownloadingFull] = useState(false);
  const [fullDownloadProgress, setFullDownloadProgress] = useState('');
  const decryptedThumbnailsCache = useRef<Map<string, string>>(new Map());
  const decryptedFullCache = useRef<Map<string, string>>(new Map());

  const loadProtectedImages = useCallback(async () => {
    if (!user || !extraPassword || !cryptoKey || !isUnlocked) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(getApiUrl(`/api/storage/protected-images?userId=${user.uid}`));
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        const decrypted = await Promise.all(
          data.images.map((img: any) =>
            processSingleProtectedImage(img, extraPassword, user, decryptedThumbnailsCache.current)
          )
        );
        setImages(decrypted.filter(Boolean));
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar imagens protegidas');
    } finally {
      setLoading(false);
    }
  }, [user, extraPassword, cryptoKey, isUnlocked]);

  const fetchFullResolution = async (img: ProtectedImageItem) => {
    try {
      setDownloadingFull(true);
      const url = await loadProtectedFullResolution(img, extraPassword!, user);
      decryptedFullCache.current.set(img.id, url);
      setImages(prev => prev.map(item => (item.id === img.id ? { ...item, originalUrl: url } : item)));
    } catch (err) {
      console.error('Error loading full resolution:', err);
    } finally {
      setDownloadingFull(false);
      setFullDownloadProgress('');
    }
  };

  useProtectedRefreshListener({ user, extraPassword, cryptoKey, isUnlocked, onRefresh: loadProtectedImages });

  return {
    images, setImages, loading, error, downloadingFull,
    fullDownloadProgress, loadProtectedImages, fetchFullResolution, decryptedFullCache
  };
}
