import React from 'react';
import { getRealFirebaseUser } from './shareUtils';
import { removeLocalShareUrl } from './shareStorage';
import { removeEncryptedShareRecovery } from './shareRecovery';
import { deleteShareApi } from './shareApi';

interface DeleteShareParams {
  shareIdToDelete?: string;
  existingShare: any;
  user: any;
  setDeletingId: (val: string | null) => void;
  setError: (val: string) => void;
  setExistingShares: React.Dispatch<React.SetStateAction<any[]>>;
  setExistingShare: (val: any) => void;
  setGeneratedLink: (val: string) => void;
  setShowCreateForm: (val: boolean) => void;
}

export async function deleteShareLogic(params: DeleteShareParams) {
  const {
    shareIdToDelete,
    existingShare,
    user,
    setDeletingId,
    setError,
    setExistingShares,
    setExistingShare,
    setGeneratedLink,
    setShowCreateForm
  } = params;

  const targetShareId = shareIdToDelete || existingShare?.id;
  if (!targetShareId) return;

  const activeUser = getRealFirebaseUser(user);
  if (!activeUser) {
    setError("Usuário não autenticado no Firebase. Aguarde a sincronização.");
    return;
  }

  setDeletingId(targetShareId);
  setError('');
  try {
    const token = await activeUser.getIdToken();
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const res = await deleteShareApi(targetShareId, token);
    if (!res.ok) {
      throw new Error('Falha ao excluir link de compartilhamento no servidor.');
    }

    removeLocalShareUrl(activeUser.uid, targetShareId);
    await removeEncryptedShareRecovery(activeUser.uid, targetShareId);

    setExistingShares(prev => {
      const remaining = prev.filter(s => s.id !== targetShareId);
      if (remaining.length > 0) {
        setExistingShare(remaining[0]);
        setGeneratedLink(remaining[0].finalUrl);
      } else {
        setExistingShare(null);
        setGeneratedLink('');
        setShowCreateForm(true);
      }
      return remaining;
    });
  } catch (err: any) {
    setError(err.message || 'Erro ao excluir link de compartilhamento.');
  } finally {
    setDeletingId(null);
  }
}
