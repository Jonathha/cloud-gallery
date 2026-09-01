import { useEffect } from 'react';
import { clearImageCache, getAllImagesFromCache, removeImageFromCache } from '../../utils/db';
import { dbPrimary } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { DecryptedImage } from './types';

export function useSettingsStorage(
  isOpen: boolean,
  user: User | null,
  images: DecryptedImage[],
  setStorageUsage: (usage: { total: number; count: number }) => void,
  setCloudStorageUsed: (usage: number) => void,
  setClearing: (clearing: boolean) => void,
  showToast: (message: string, type?: any) => void
) {
  useEffect(() => {
    const calculateStorage = async () => {
      try {
        const cachedImages = await getAllImagesFromCache();
        let totalBytes = 0;
        cachedImages.forEach(img => {
          if (img.ciphertext) {
            if (typeof img.ciphertext === 'string') {
              totalBytes += (img.ciphertext.length * 0.75);
            } else if (img.ciphertext instanceof Uint8Array || img.ciphertext instanceof ArrayBuffer) {
              totalBytes += img.ciphertext.byteLength;
            }
          }
        });
        setStorageUsage({ total: totalBytes, count: cachedImages.length });
      } catch (e) {
        console.error('Error calculating storage:', e);
      }
    };
    
    const loadCloudStorageBytes = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(dbPrimary, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const cloudUsage = userDocSnap.data().storageUsed || 0;
          setCloudStorageUsed(cloudUsage);
        }
      } catch (err) {
        console.error('Error fetching cloud storage used:', err);
      }
    };
    
    if (isOpen) {
      calculateStorage();
      loadCloudStorageBytes();
    }
  }, [isOpen, images, user]);

  const handleRemoveFailedImages = async () => {
    setClearing(true);
    try {
      const failedImages = images.filter(img => img.failed);
      for (const img of failedImages) {
        await removeImageFromCache(img.id);
      }
      showToast(`${failedImages.length} imagens corrompidas removidas`);
    } catch (error) {
      showToast('Erro ao remover imagens corrompidas', 'error');
    } finally {
      setClearing(false);
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await clearImageCache();
      showToast('Cache limpo com sucesso');
    } catch (error) {
      showToast('Erro ao limpar cache', 'error');
    } finally {
      setClearing(false);
    }
  };

  return { handleRemoveFailedImages, handleClearCache };
}
