import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRealFirebaseUser, MAX_SHARE_LINKS } from './share/shareUtils';
import { checkExistingShareLogic, getCachedShares, setCachedShares } from './share/shareCheck';
import { deleteShareLogic } from './share/shareDelete';
import { generateShareLogic } from './share/shareGenerate';
import { fetchMyShares } from './share/shareApi';

export function useShareLogic(isOpen: boolean, imageId: string, decryptedImageUrl: string, onClose: () => void) {
  const { user, cryptoKey } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [accountShares, setAccountShares] = useState<any[] | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [existingShares, setExistingSharesState] = useState<any[]>([]);
  const [existingShare, setExistingShare] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [oneTimeView, setOneTimeViewState] = useState(false);
  const [linkDuration, setLinkDuration] = useState<'1h' | 'permanent'>('1h');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const downloadBeforeOneTime = useRef(true);

  // Keeps the instant-open cache in sync with every list change (create, delete, refresh).
  const setExistingShares: React.Dispatch<React.SetStateAction<any[]>> = (updater) => {
    setExistingSharesState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: any[]) => any[])(prev) : updater;
      const uid = getRealFirebaseUser(user)?.uid;
      if (uid && imageId) setCachedShares(uid, imageId, next);
      return next;
    });
  };

  const checkExistingShare = async () => checkExistingShareLogic({
    user, cryptoKey, imageId, setChecking, setCheckFailed, setError, setRefreshing,
    setExistingShares: setExistingSharesState, setExistingShare, setGeneratedLink, setShowCreateForm
  });

  useEffect(() => {
    if (!isOpen || !imageId) return;
    setLimitOpen(false);
    if (getRealFirebaseUser(user)) {
      void checkExistingShare();
    } else {
      setChecking(false);
      setCheckFailed(true);
      setShowCreateForm(false);
      setError('Entre na sua conta para verificar os compartilhamentos desta mídia.');
    }
  }, [isOpen, imageId, getRealFirebaseUser(user)?.uid]);

  // "Visualização única" e "permitir download" nunca ficam ativos juntos: ligar uma desliga a outra,
  // e o download volta ao valor anterior quando a visualização única é desligada.
  const setOneTimeView = (value: boolean) => {
    if (value === oneTimeView) return;
    if (value) {
      downloadBeforeOneTime.current = allowDownload;
      setAllowDownload(false);
    } else {
      setAllowDownload(downloadBeforeOneTime.current);
    }
    setOneTimeViewState(value);
  };
  const setAllowDownloadSafe = (value: boolean) => {
    if (oneTimeView) return;
    setAllowDownload(value);
  };

  const handleDeleteShare = async (shareIdToDelete?: string) => deleteShareLogic({
    shareIdToDelete, existingShare, user, setDeletingId, setError,
    setExistingShares, setExistingShare, setGeneratedLink, setShowCreateForm
  });

  /** Loads every active link of the account (all media); only requested when the user asks to see them. */
  const loadAccountShares = async () => {
    const activeUser = getRealFirebaseUser(user);
    if (!activeUser) {
      setAccountError('Não foi possível confirmar sua sessão. Entre novamente e tente de novo.');
      return;
    }
    setAccountLoading(true);
    setAccountError('');
    try {
      const token = await activeUser.getIdToken();
      if (!token) throw new Error('Token de autenticação não encontrado.');
      const res = await fetchMyShares(token);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Não foi possível carregar seus links. Tente novamente.');
      setAccountShares(data.shares || []);
    } catch (err: any) {
      setAccountError(err.message || 'Não foi possível carregar seus links. Tente novamente.');
    } finally {
      setAccountLoading(false);
    }
  };

  /** Deletes the chosen links one by one; returns how many were removed. */
  const handleDeleteMany = async (ids: string[]) => {
    setBulkDeleting(true);
    const removedIds: string[] = [];
    try {
      for (const id of ids) {
        const ok = await handleDeleteShare(id);
        if (!ok) break;
        removedIds.push(id);
      }
    } finally {
      setBulkDeleting(false);
    }
    if (removedIds.length > 0) {
      const removedItems = (accountShares || []).filter(item => removedIds.includes(item.id));
      const uid = getRealFirebaseUser(user)?.uid;
      if (uid) {
        // Links apagados podem ser de outras mídias: tira-os do cache de abertura rápida delas.
        removedItems.forEach(item => {
          const cached = getCachedShares(uid, item.imageId);
          if (cached) setCachedShares(uid, item.imageId, cached.filter(c => c.id !== item.id));
        });
      }
      const remaining = (accountShares || []).filter(item => !removedIds.includes(item.id));
      setAccountShares(remaining);
      if (remaining.length < MAX_SHARE_LINKS) {
        setLimitOpen(false);
        setShowCreateForm(true);
      }
    }
    return removedIds.length;
  };

  const handleGenerateShare = async () => {
    if (checking || checkFailed || loading) return;
    await generateShareLogic({
      existingShares, existingShare, requirePassword, password, user, cryptoKey,
      imageId, decryptedImageUrl, allowDownload, oneTimeView, linkDuration,
      setError, setLoading, setGeneratedLink, setExistingShare, setExistingShares,
      setShowCreateForm, setPassword, setRequirePassword, setAllowDownload,
      setOneTimeView: setOneTimeViewState, setLinkDuration,
      onLimitReached: (code) => {
        // Esta mídia já tem link: a lista local estava desatualizada, confirma com o servidor.
        if (code === 'MEDIA_ALREADY_SHARED') { void checkExistingShare(); return; }
        setAccountShares(null);
        setAccountError('');
        setLimitOpen(true);
      }
    });
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    loading, checking, refreshing, checkFailed, refreshShares: checkExistingShare, deletingId, bulkDeleting,
    limitOpen, setLimitOpen, maxLinks: MAX_SHARE_LINKS,
    accountShares, accountLoading, accountError, loadAccountShares,
    existingShare, existingShares, showCreateForm, setShowCreateForm,
    requirePassword, setRequirePassword, password, setPassword, allowDownload,
    setAllowDownload: setAllowDownloadSafe, oneTimeView, setOneTimeView, linkDuration, setLinkDuration,
    generatedLink, copied, error, setError, handleDeleteShare, handleDeleteMany, handleGenerateShare,
    handleCopy,
  };
}
