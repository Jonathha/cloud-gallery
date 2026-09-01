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
    setLinkDuration
  } = params;

  setError('');
  if (existingShares.length > 0 || existingShare) {
    setError('Já existe um link de compartilhamento ativo para esta mídia. Exclua o link existente para gerar um novo.');
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
      userId: activeUser.uid,
      userEmail: activeUser.email || '',
      details: `Novo link de compartilhamento gerado para a mídia ID: ${imageId}`
    });
  } catch (err: any) {
    console.error(err);
    setError(err.message || 'Erro inesperado na geração do compartilhamento seguro.');
  } finally {
    setLoading(false);
  }
}
