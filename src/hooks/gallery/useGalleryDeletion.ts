import React from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { dbPrimary } from '../../firebase';
import { DecryptedImage } from '../../types';
import { getImageFromCache, removeImageFromCache, saveToTrash } from '../../utils/db';
import { fetchAndUnpackImage } from '../../utils/fileCrypto';
import { getApiUrl } from '../../utils/apiUrl';
import { recordAuditEvent } from '../../services/adminAuditService';

export function useGalleryDeletion(
  user: any,
  images: DecryptedImage[],
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  selectedImageId: string | null,
  setSelectedImage: React.Dispatch<React.SetStateAction<string | null>>,
  setSelectedImageId: React.Dispatch<React.SetStateAction<string | null>>,
  imageToDelete: string | null,
  setImageToDelete: React.Dispatch<React.SetStateAction<string | null>>,
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
) {
  const handleDelete = async () => {
    if (!imageToDelete) return;
    const id = imageToDelete;
    
    // 1. OPTIMISTIC UPDATE: Immediately update the UI state to remove the image,
    // clear deletion target, and close active lightbox if this image is selected.
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) {
      setSelectedImage(null);
      setSelectedImageId(null);
    }
    setImageToDelete(null);
    showToast('Imagem movida para a lixeira!', 'success');
    recordAuditEvent({
      type: 'file_delete',
      userId: user?.uid,
      userEmail: user?.email || '',
      details: `Arquivo ID ${id} movido para a lixeira`
    });

    // 2. BACKGROUND PROCESSING: Perform the storage, cache, and DB deletion non-blockingly
    (async () => {
      try {
        let cachedImage = await getImageFromCache(id);
        let skipTrash = false;
        if (!cachedImage || !cachedImage.ciphertext) {
          try {
            const token = user ? await user.getIdToken() : undefined;
            cachedImage = await fetchAndUnpackImage(id, token);
          } catch (fetchErr) {
            console.warn('Erro ao obter imagem para salvar na lixeira em segundo plano:', fetchErr);
            skipTrash = true;
          }
        }

        if (!skipTrash) {
          if (cachedImage && cachedImage.ciphertext) {
            await saveToTrash({
              ...cachedImage,
              createdAt: cachedImage.createdAt,
              trashedAt: Date.now(),
              deletedAt: Date.now()
            });
          }
        }
        
        await removeImageFromCache(id);
        
        if (user && navigator.onLine) {
          try {
            await deleteDoc(doc(dbPrimary, 'images', id));
          } catch (fsErr) {
            console.warn('Erro ao deletar imagem do Firestore:', fsErr);
          }
          try {
            const token = await user.getIdToken();
            await fetch(getApiUrl(`/api/storage/image/${id}`), {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (serverErr) {
            console.warn('Erro ao deletar do servidor local:', serverErr);
          }
        }
      } catch (error) {
        console.error('Erro ao processar exclusão em segundo plano:', error);
      }
    })();
  };

  return { handleDelete };
}
