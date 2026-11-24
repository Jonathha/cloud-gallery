import React from 'react';
import { recordAuditEvent } from '../../services/adminAuditService';
import { getRealFirebaseUser } from './shareUtils';
import { setLocalShareUrl } from './shareStorage';
import { saveEncryptedShareRecovery } from './shareRecovery';
import { createShareApi } from './shareApi';
import { buildSharePayload } from './shareCreate';

interface GenerateShareParams {
  existingShares: any[];
  existingShare: any;
  requirePassword: boolean;
  password: string;
  user: any;
  cryptoKey: CryptoKey | null;
  imageId: string;
  decryptedImageUrl: string;
  allowDownload: boolean;
  oneTimeView: boolean;
  linkDuration: '1h' | 'permanent';
  setError: (val: string) => void;
  setLoading: (val: boolean) => void;
  setGeneratedLink: (val: string) => void;
  setExistingShare: (val: any) => void;
  setExistingShares: React.Dispatch<React.SetStateAction<any[]>>;
  setShowCreateForm: (val: boolean) => void;
  setPassword: (val: string) => void;
  setRequirePassword: (val: boolean) => void;
  setAllowDownload: (val: boolean) => void;
  setOneTimeView: (val: boolean) => void;
  setLinkDuration: (val: '1h' | 'permanent') => void;
  onLimitReached?: (code?: string) => void;
}

export async function generateShareLogic(params: GenerateShareParams) {
  const {
    existingShares,
    existingShare,
    requirePassword,
    password,
    user,
    cryptoKey,
    imageId,
    decryptedImageUrl,
    allowDownload,
    oneTimeView,
    linkDuration,
    setError,
    setLoading,
    setGeneratedLink,
    setExistingShare,
    setExistingShares,
    setShowCreateForm,
    setPassword,
    setRequirePassword,
    setAllowDownload,
    setOneTimeView,
    setLinkDuration,
    onLimitReached
  } = params;

  setError('');
  // Cada mídia tem no máximo 1 link ativo; o limite por conta é validado pelo servidor.
  if (existingShares.length > 0) return;

  // Visualização única e download são mutuamente exclusivos (a UI já impede; isto é a trava final).
  if (oneTimeView && allowDownload) {
    setError('Visualização única não permite download. Desative uma das duas opções.');
    return;
  }

  if (requirePassword && password.length < 6) {
    setError('A senha de proteção deve ter pelo menos 6 dígitos ou caracteres.');
    return;
  }

  const activeUser = getRealFirebaseUser(user);
  if (!activeUser) {
    setError("Usuário não autenticado no Firebase. Aguarde a sincronização de sessão.");
    return;
  }

  setLoading(true);
  try {
    const token = await activeUser.getIdToken();
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const { shareDocData, finalUrl, shareId, shareKeyBase64 } = await buildSharePayload({
      imageId,
      userId: activeUser.uid,
      decryptedImageUrl,
      requirePassword,
      password,
      allowDownload,
      oneTimeView,
      linkDuration,
    });

    const res = await createShareApi(shareDocData, token);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.code === 'SHARE_LIMIT_REACHED' || errorData.code === 'MEDIA_ALREADY_SHARED') {
        onLimitReached?.(errorData.code);
        return;
      }
      throw new Error(errorData.error || 'Falha ao registrar compartilhamento no servidor seguro.');
    }
    
    setLocalShareUrl(activeUser.uid, shareId, finalUrl);
    await saveEncryptedShareRecovery(activeUser.uid, cryptoKey, shareId, shareKeyBase64, finalUrl);

    const newShareObj = {
      ...shareDocData,
      finalUrl
    };

    setGeneratedLink(finalUrl);
    setExistingShare(newShareObj);
    setExistingShares(prev => [newShareObj, ...prev]);
    setShowCreateForm(false);

    setPassword('');
    setRequirePassword(false);
    setAllowDownload(true);
    setOneTimeView(false);
    setLinkDuration('1h');

    recordAuditEvent({
      type: 'share_create',
      action: 'share_create',
      userId: activeUser.uid,
      userEmail: activeUser.email || '',
      mediaType: shareDocData.contentType,
      fileSize: shareDocData.totalSize,
      resourceId: shareId,
      method: [
        requirePassword ? 'Protegido por senha' : 'Sem senha',
        oneTimeView ? 'Visualização única' : (allowDownload ? 'Download permitido' : 'Somente visualização'),
        linkDuration === '1h' ? 'Expira em 1h' : 'Permanente'
      ].join(' • '),
      result: 'Link de compartilhamento público gerado com sucesso',
      status: 'success',
      details: `Novo link de compartilhamento (${shareId}) gerado para a mídia ID: ${imageId}`
    });
  } catch (err: any) {
    console.error(err);
    setError(err.message || 'Erro inesperado na geração do compartilhamento seguro.');
  } finally {
    setLoading(false);
  }
}
