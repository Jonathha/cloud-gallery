import React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { dbPrimary } from '../../firebase';
import { deriveKey, decryptData } from '../../utils/crypto';
import { getApiUrl } from '../../utils/apiUrl';
import { motion } from 'framer-motion';

import { SettingsUnlockScreen } from './fakeVault/SettingsUnlockScreen';
import { SecurityImagePasswordForm } from './fakeVault/SecurityImagePasswordForm';
import { SecurityImageSelector } from './fakeVault/SecurityImageSelector';
import { CreateSecurityPasswordPrompt } from './fakeVault/CreateSecurityPasswordPrompt';

interface DecryptedImage {
  id: string;
  url: string;
  failed?: boolean;
  createdAt: number;
}

interface FakeVaultTabProps {
  extraPassword: string | null;
  isSettingsUnlocked: boolean;
  setIsSettingsUnlocked: (val: boolean) => void;
  unlockPasswordInput: string;
  setUnlockPasswordInput: (val: string) => void;
  newExtraPassword: string;
  setNewExtraPassword: (val: string) => void;
  handleUpdateExtraPassword: (customPassword?: string) => Promise<void> | void;
  isUpdatingPassword: boolean;
  securityImageId: string | null;
  setSecurityImage: (id: string | null, customExtraPassword?: string) => Promise<void>;
  images: DecryptedImage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function FakeVaultTab({
  extraPassword,
  isSettingsUnlocked,
  setIsSettingsUnlocked,
  unlockPasswordInput,
  setUnlockPasswordInput,
  handleUpdateExtraPassword,
  isUpdatingPassword,
  securityImageId,
  setSecurityImage,
  images,
  showToast
}: FakeVaultTabProps) {
  // Estados locais para alteração segura de senha das imagens (senha extra)
  const [currentPass, setCurrentPass] = React.useState('');
  const [newPass, setNewPass] = React.useState('');
  const [confirmNewPass, setConfirmNewPass] = React.useState('');

  const [showCreatePrompt, setShowCreatePrompt] = React.useState(false);
  const [pendingImageId, setPendingImageId] = React.useState<string | null>(null);
  const [promptPassword, setPromptPassword] = React.useState('');
  const [promptConfirmPassword, setPromptConfirmPassword] = React.useState('');
  const [isSubmittingPrompt, setIsSubmittingPrompt] = React.useState(false);

  const [protectedImgUrl, setProtectedImgUrl] = React.useState<string | null>(null);
  const [loadingProtected, setLoadingProtected] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchAndDecryptProtectedImage = async () => {
      if (!securityImageId || !extraPassword) {
        setProtectedImgUrl(null);
        return;
      }
      try {
        setLoadingProtected(true);
        const keyDoc = await getDoc(doc(dbPrimary, 'media_keys', securityImageId));
        if (!keyDoc.exists()) {
          if (active) setProtectedImgUrl(null);
          return;
        }
        const auxKey = keyDoc.data().auxKey;
        
        const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0')); 
        const combinedKey = await deriveKey(extraPassword, salt);

        const imgRes = await fetch(getApiUrl(`/api/storage/image/${securityImageId}`));
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          if (imgData.success && imgData.image) {
            const fileData = imgData.image;
            try {
              if (fileData.fileKeyCiphertext && fileData.fileKeyIv) {
                const { decryptFileKey, decryptWithFileKey } = await import('../../utils/fileCrypto');
                const fileKeyStr = await decryptFileKey(fileData.fileKeyCiphertext, fileData.fileKeyIv, combinedKey);
                
                let cipher = fileData.thumbnailCiphertext || fileData.ciphertext;
                let iv = fileData.thumbnailIv || fileData.iv;
                if (cipher && iv) {
                  let decryptedUrl = await decryptWithFileKey(cipher, iv, fileKeyStr, fileData.fileSalt);
                  if (!decryptedUrl.startsWith('data:') && !decryptedUrl.startsWith('blob:')) {
                    decryptedUrl = `data:${fileData.contentType || "image/jpeg"};base64,${decryptedUrl}`;
                  }
                  if (active) setProtectedImgUrl(decryptedUrl);
                }
              } else {
                let cipher = fileData.thumbnailCiphertext || fileData.ciphertext;
                let iv = fileData.thumbnailIv || fileData.iv;
                if (cipher && iv) {
                  let decryptedUrl = await decryptData(cipher, iv, combinedKey);
                  if (!decryptedUrl.startsWith('data:') && !decryptedUrl.startsWith('blob:')) {
                    decryptedUrl = `data:${fileData.contentType || "image/jpeg"};base64,${decryptedUrl}`;
                  }
                  if (active) setProtectedImgUrl(decryptedUrl);
                }
              }
            } catch (decErr) {
              console.error("Failed to decrypt active protected image for preview:", decErr);
            }
          }
        }
      } catch (err) {
        console.error("Error decrypting active protected image for preview:", err);
      } finally {
        if (active) setLoadingProtected(false);
      }
    };

    fetchAndDecryptProtectedImage();
    return () => {
      active = false;
    };
  }, [securityImageId, extraPassword]);

  const handleSavePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (extraPassword) {
      if (!currentPass) {
        showToast('Por favor, digite a senha extra atual', 'error');
        return;
      }
      if (currentPass.trim() !== extraPassword.trim()) {
        showToast('A senha extra atual está incorreta', 'error');
        return;
      }
    }

    if (!newPass) {
      showToast('A nova senha não pode estar vazia', 'error');
      return;
    }

    if (newPass.length < 4) {
      showToast('A nova senha deve ter pelo menos 4 caracteres', 'error');
      return;
    }

    if (newPass !== confirmNewPass) {
      showToast('As novas senhas não coincidem', 'error');
      return;
    }

    try {
      await handleUpdateExtraPassword(newPass);
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar senha', 'error');
    }
  };

  const handleSubmitPrompt = async () => {
    if (promptPassword.length < 4) {
      showToast('A nova senha deve ter pelo menos 4 caracteres', 'error');
      return;
    }
    if (promptPassword !== promptConfirmPassword) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    try {
      setIsSubmittingPrompt(true);
      await handleUpdateExtraPassword(promptPassword);
      
      if (pendingImageId) {
        await setSecurityImage(pendingImageId, promptPassword);
        showToast('Senha criada e imagem protegida com sucesso!');
      } else {
        showToast('Senha de segurança criada com sucesso!');
      }
      setShowCreatePrompt(false);
      setPendingImageId(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao criar senha e proteger imagem', 'error');
    } finally {
      setIsSubmittingPrompt(false);
    }
  };

  if (extraPassword && !isSettingsUnlocked) {
    return (
      <SettingsUnlockScreen 
        extraPassword={extraPassword}
        unlockPasswordInput={unlockPasswordInput}
        setUnlockPasswordInput={setUnlockPasswordInput}
        setIsSettingsUnlocked={setIsSettingsUnlocked}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-white mb-2">Imagem Protegida</h3>
        <div className="p-4 bg-zinc-900/50 border border-white/10 rounded-2xl mb-6">
          <p className="text-sm text-zinc-300 leading-relaxed">
            A <strong>Imagem Protegida</strong> é uma camada de segurança avançada para uma foto específica. A imagem selecionada ficará borrada e trancada com um cadeado na sua Cloud Gallery. Para visualizá-la, será necessário digitar a senha de até 15 dígitos definida abaixo.
          </p>
        </div>

        <SecurityImagePasswordForm 
          extraPassword={extraPassword}
          currentPass={currentPass}
          setCurrentPass={setCurrentPass}
          newPass={newPass}
          setNewPass={setNewPass}
          confirmNewPass={confirmNewPass}
          setConfirmNewPass={setConfirmNewPass}
          isUpdatingPassword={isUpdatingPassword}
          handleSavePasswordChange={handleSavePasswordChange}
        />

        <SecurityImageSelector 
          securityImageId={securityImageId}
          loadingProtected={loadingProtected}
          protectedImgUrl={protectedImgUrl}
          images={images}
          setSecurityImage={setSecurityImage}
          showToast={showToast}
          extraPassword={extraPassword}
          setPendingImageId={setPendingImageId}
          setShowCreatePrompt={setShowCreatePrompt}
          setPromptPassword={setPromptPassword}
          setPromptConfirmPassword={setPromptConfirmPassword}
        />
      </motion.div>

      {showCreatePrompt && (
        <CreateSecurityPasswordPrompt 
          promptPassword={promptPassword}
          setPromptPassword={setPromptPassword}
          promptConfirmPassword={promptConfirmPassword}
          setPromptConfirmPassword={setPromptConfirmPassword}
          isSubmittingPrompt={isSubmittingPrompt}
          setShowCreatePrompt={setShowCreatePrompt}
          setPendingImageId={setPendingImageId}
          onSubmit={handleSubmitPrompt}
        />
      )}
    </div>
  );
}
