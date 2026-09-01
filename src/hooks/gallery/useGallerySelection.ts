import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getImageFromCache, removeImageFromCache, saveToTrash } from '../../utils/db';
import { deleteDoc, doc } from 'firebase/firestore';
import { dbPrimary } from '../../firebase';
import { DecryptedImage } from '../../types';
import { fetchAndUnpackImage } from '../../utils/fileCrypto';
import { getApiUrl } from '../../utils/apiUrl';

export function useGallerySelection(
  images: DecryptedImage[],
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) {
  const { user } = useAuth();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [duplicatesToDelete, setDuplicatesToDelete] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleSelectionClick = (img: DecryptedImage, index: number, e: React.MouseEvent) => {
    if (e?.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = images.slice(start, end + 1).map(i => i.id);
      setSelectedForDeletion(prev => {
        const newSet = new Set(prev);
        rangeIds.forEach(id => newSet.add(id));
        return Array.from(newSet);
      });
    } else {
      setSelectedForDeletion(prev => 
        prev.includes(img.id) ? prev.filter(id => id !== img.id) : [...prev, img.id]
      );
    }
    setLastSelectedIndex(index);
  };

  const handleDeleteMultiple = async () => {
    setIsDeletingMultiple(false);
    const ids = [...selectedForDeletion];
    
    // 1. OPTIMISTIC UPDATE: Clear state immediately
    setImages(prev => prev.filter(img => !ids.includes(img.id)));
    setSelectedForDeletion([]);
    setIsSelectionMode(false);
    showToast('Removendo mídias selecionadas...', 'success');

    // 2. BACKGROUND CONCURRENT PROCESSING
    (async () => {
      try {
        const deletePromises = ids.map(async (id) => {
          try {
            let cachedImage = await getImageFromCache(id);
            let skipTrash = false;
            if (!cachedImage || !cachedImage.ciphertext) {
              try {
                cachedImage = await fetchAndUnpackImage(id);
              } catch (fetchErr) {
                console.warn('Erro ao obter imagem para salvar na lixeira:', fetchErr);
                skipTrash = true;
              }
            }

            if (!skipTrash && cachedImage && cachedImage.ciphertext) {
              await saveToTrash({
                ...cachedImage,
                createdAt: cachedImage.createdAt,
                trashedAt: Date.now(),
                deletedAt: Date.now()
              });
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
              return true;
            } else {
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
              return false;
            }
          } catch (err) {
            console.error(`Erro ao deletar item ${id}:`, err);
            return false;
          }
        });

        const results = await Promise.all(deletePromises);
        const successCount = results.filter(Boolean).length;
        if (successCount < ids.length) {
          showToast(`${successCount} mídias movidas para a lixeira. ${ids.length - successCount} removidas diretamente sem dados originais.`, 'success');
        } else {
          showToast(`${successCount} mídias movidas para a lixeira!`);
        }
      } catch (error) {
        console.error('Erro ao excluir imagens:', error);
        showToast('Erro ao excluir imagens.', 'error');
      }
    })();
  };

  const handleCleanDuplicates = async () => {
    setIsCleaningDuplicates(false);
    const ids = [...duplicatesToDelete];
    
    // 1. OPTIMISTIC UPDATE: Clear state immediately
    setImages(prev => prev.filter(img => !ids.includes(img.id)));
    setDuplicatesToDelete([]);
    setIsSelectionMode(false);
    showToast('Limpando duplicatas selecionadas...', 'success');

    // 2. BACKGROUND CONCURRENT PROCESSING
    (async () => {
      try {
        const deletePromises = ids.map(async (id) => {
          try {
            let cachedImage = await getImageFromCache(id);
            let skipTrash = false;
            if (!cachedImage || !cachedImage.ciphertext) {
              try {
                cachedImage = await fetchAndUnpackImage(id);
              } catch (fetchErr) {
                console.warn('Erro ao obter imagem para salvar na lixeira:', fetchErr);
                skipTrash = true;
              }
            }

            if (!skipTrash && cachedImage && cachedImage.ciphertext) {
              await saveToTrash({
                ...cachedImage,
                createdAt: cachedImage.createdAt,
                trashedAt: Date.now(),
                deletedAt: Date.now()
              });
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
              return true;
            } else {
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
              return false;
            }
          } catch (err) {
            console.error(`Erro ao limpar duplicada ${id}:`, err);
            return false;
          }
        });

        const results = await Promise.all(deletePromises);
        const successCount = results.filter(Boolean).length;
        if (successCount < ids.length) {
          showToast(`${successCount} duplicatas movidas para a lixeira. ${ids.length - successCount} removidas diretamente sem dados originais.`, 'success');
        } else {
          showToast(`${successCount} duplicatas movidas para a lixeira!`);
        }
      } catch (error) {
        console.error('Erro ao limpar duplicatas:', error);
        showToast('Erro ao limpar duplicatas.', 'error');
      }
    })();
  };

  return {
    isSelectionMode,
    setIsSelectionMode,
    selectedForDeletion,
    setSelectedForDeletion,
    isDeletingMultiple,
    setIsDeletingMultiple,
    isCleaningDuplicates,
    setIsCleaningDuplicates,
    duplicatesToDelete,
    setDuplicatesToDelete,
    lastSelectedIndex,
    setLastSelectedIndex,
    handleSelectionClick,
    handleDeleteMultiple,
    handleCleanDuplicates,
  };
}
