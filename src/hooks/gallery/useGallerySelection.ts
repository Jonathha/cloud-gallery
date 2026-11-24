import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DecryptedImage } from '../../types';
import { useSelectionState } from './selection/useSelectionState';
import { handleRangeOrToggleSelect } from './selection/selectionClickHandler';
import { runBatchDelete } from './selection/batchDeleteRunner';
import { recordAuditEvent } from '../../services/adminAuditService';

export function useGallerySelection(
  images: DecryptedImage[], setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) {
  const { user } = useAuth();
  const state = useSelectionState();

  const handleSelectionClick = (img: DecryptedImage, index: number, e: React.MouseEvent) => {
    handleRangeOrToggleSelect(img, index, e, images, state.lastSelectedIndex, state.setSelectedForDeletion, state.setLastSelectedIndex);
  };
  const handleDeleteMultiple = async () => {
    state.setIsDeletingMultiple(false);
    const ids = [...state.selectedForDeletion];
    const allItems = images.filter(img => ids.includes(img.id));
    setImages(prev => prev.filter(img => !ids.includes(img.id)));
    state.setSelectedForDeletion([]); state.setIsSelectionMode(false);
    showToast('Removendo mídias selecionadas...', 'success');
    const { okIds } = await runBatchDelete(ids, user, 'mídias', showToast);
    const selectedItems = allItems.filter(img => okIds.includes(img.id));
    const totalSize = selectedItems.reduce((acc, item) => acc + (item.totalSize || 0), 0);
    const types = Array.from(new Set(selectedItems.map(item => item.contentType || (item.isVideo ? 'video' : 'image')).filter(Boolean)));
    const allOk = okIds.length === ids.length;
    recordAuditEvent({
      type: 'file_delete',
      action: 'file_delete',
      userId: user?.uid,
      userEmail: user?.email || '',
      itemCount: okIds.length,
      fileSize: totalSize > 0 ? totalSize : undefined,
      mediaType: types.length > 0 ? types.join(', ') : undefined,
      resourceId: okIds.length > 0 ? okIds.slice(0, 5).join(', ') + (okIds.length > 5 ? ` (+${okIds.length - 5})` : '') : undefined,
      result: allOk ? `${ids.length} mídia(s) enviada(s) para a lixeira em lote` : `${okIds.length}/${ids.length} mídia(s) enviada(s) para a lixeira em lote`,
      status: allOk ? 'success' : 'error',
      details: `Exclusão em lote: ${okIds.length} de ${ids.length} arquivo(s) movido(s) para a lixeira`
    });
  };
  const handleCleanDuplicates = async () => {
    state.setIsCleaningDuplicates(false);
    const ids = [...state.duplicatesToDelete];
    const allItems = images.filter(img => ids.includes(img.id));
    setImages(prev => prev.filter(img => !ids.includes(img.id)));
    state.setDuplicatesToDelete([]); state.setIsSelectionMode(false);
    showToast('Limpando duplicatas selecionadas...', 'success');
    const { okIds } = await runBatchDelete(ids, user, 'duplicatas', showToast);
    const selectedItems = allItems.filter(img => okIds.includes(img.id));
    const totalSize = selectedItems.reduce((acc, item) => acc + (item.totalSize || 0), 0);
    const allOk = okIds.length === ids.length;
    recordAuditEvent({
      type: 'file_delete',
      action: 'file_delete',
      userId: user?.uid,
      userEmail: user?.email || '',
      itemCount: okIds.length,
      fileSize: totalSize > 0 ? totalSize : undefined,
      resourceId: okIds.length > 0 ? okIds.slice(0, 5).join(', ') + (okIds.length > 5 ? ` (+${okIds.length - 5})` : '') : undefined,
      result: allOk ? `${ids.length} duplicata(s) movida(s) para a lixeira` : `${okIds.length}/${ids.length} duplicata(s) movida(s) para a lixeira`,
      status: allOk ? 'success' : 'error',
      details: `Limpeza de duplicatas: ${okIds.length} de ${ids.length} arquivo(s) movido(s) para a lixeira`
    });
  };

  return { ...state, handleSelectionClick, handleDeleteMultiple, handleCleanDuplicates };
}
