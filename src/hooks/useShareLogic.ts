import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRealFirebaseUser } from './share/shareUtils';
import { checkExistingShareLogic } from './share/shareCheck';
import { deleteShareLogic } from './share/shareDelete';
import { generateShareLogic } from './share/shareGenerate';

export function useShareLogic(
  isOpen: boolean,
  imageId: string,
  decryptedImageUrl: string,
  onClose: () => void
) {
  const { user, cryptoKey } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [existingShares, setExistingShares] = useState<any[]>([]);
  const [existingShare, setExistingShare] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [oneTimeView, setOneTimeView] = useState(false);
  const [linkDuration, setLinkDuration] = useState<'1h' | 'permanent'>('1h');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const activeUser = getRealFirebaseUser(user);
    if (isOpen && imageId && activeUser) {
      checkExistingShare();
    } else if (isOpen && imageId && !activeUser) {
      setChecking(false);
    }
  }, [isOpen, imageId, user]);

  const checkExistingShare = async () => {
    await checkExistingShareLogic({
      user, cryptoKey, imageId, setChecking, setError,
      setExistingShares, setExistingShare, setGeneratedLink, setShowCreateForm
    });
  };

  const handleDeleteShare = async (shareIdToDelete?: string) => {
    await deleteShareLogic({
      shareIdToDelete, existingShare, user, setDeletingId, setError,
      setExistingShares, setExistingShare, setGeneratedLink, setShowCreateForm
    });
  };

  const handleGenerateShare = async () => {
    await generateShareLogic({
      existingShares, existingShare, requirePassword, password, user, cryptoKey,
      imageId, decryptedImageUrl, allowDownload, oneTimeView, linkDuration,
      setError, setLoading, setGeneratedLink, setExistingShare, setExistingShares,
      setShowCreateForm, setPassword, setRequirePassword, setAllowDownload,
      setOneTimeView, setLinkDuration
    });
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    loading, checking, deletingId, existingShare, existingShares,
    showCreateForm, setShowCreateForm, requirePassword, setRequirePassword,
    password, setPassword, allowDownload, setAllowDownload,
    oneTimeView, setOneTimeView, linkDuration, setLinkDuration,
    generatedLink, copied, error, setError,
    handleDeleteShare, handleGenerateShare, handleCopy,
  };
}


