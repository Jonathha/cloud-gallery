import React from 'react';
import { DecryptedImage } from '../../types';
import { recordAuditEvent } from '../../services/adminAuditService';
import { deleteSingleItem } from './selection/batchDeleteRunner';
import { getImageFromCache } from '../../utils/db';

export function useGalleryDeletion(
  user: any, _images: DecryptedImage[],
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
    const targetImg = _images.find(img => img.id === id);

    // Remove da tela primeiro (com animação curta) para a interface responder na hora
    const el = document.querySelector(`[data-media-id="${id}"]`) as HTMLElement | null;
    const removeFromList = () => setImages(prev => prev.filter(img => img.id !== id));
    const anim = el?.animate?.(
      [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.85)' }],
      { duration: 160, easing: 'ease-out', fill: 'forwards' }
    );
    if (anim) anim.finished.then(removeFromList, removeFromList);
    else removeFromList();
    if (selectedImageId === id) { setSelectedImage(null); setSelectedImageId(null); }
    setImageToDelete(null);
    showToast(targetImg?.isVideo ? 'Vídeo movido para a lixeira!' : 'Imagem movida para a lixeira!', 'success');

    const cachedImg = await getImageFromCache(id).catch(() => undefined);
    const mediaType = targetImg?.contentType || cachedImg?.contentType || (targetImg?.isVideo ? 'video' : undefined);
    const fileSize = targetImg?.totalSize || cachedImg?.totalSize;
    const fileName = (targetImg as any)?.fileName || (cachedImg as any)?.fileName;
    const ok = await deleteSingleItem(id, user).catch(() => false);
    recordAuditEvent({
      type: 'file_delete',
      action: 'file_delete',
      userId: user?.uid,
      userEmail: user?.email || '',
      fileName,
      mediaType,
      fileSize,
      itemCount: 1,
      resourceId: id,
      result: ok ? 'Arquivo movido para a lixeira com sucesso' : 'Falha ao mover arquivo para a lixeira',
      status: ok ? 'success' : 'error',
      details: `Arquivo ID ${id}${fileName ? ` (${fileName})` : ''} movido para a lixeira`
    });
    if (!ok) {
      window.dispatchEvent(new CustomEvent('refresh-gallery-list'));
      showToast('Não foi possível mover a mídia para a lixeira.', 'error');
    }
  };
  return { handleDelete };
}
