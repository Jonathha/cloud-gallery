import React, { useState, useCallback, useEffect, useRef } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { dbPrimary } from '../firebase';
import { saveImageToCache } from '../utils/db';
import { ToastType } from '../components/Toast';
import { sendNativeNotification } from '../utils/nativeNotifications';
import { prepareMediaFile } from './useImageUploader/mediaPrepare';
import { uploadToCofreAndFirestore } from './useImageUploader/uploadServer';

export function useImageUploaderLogic(
  onComplete?: () => void,
  onUploadingStateChange?: (isUploading: boolean) => void,
  initialFiles: File[] = []
) {
  const { user, cryptoKey } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const isUploadingRef = useRef(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    window.dispatchEvent(new CustomEvent('show-app-toast', {
      detail: { message, type }
    }));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !cryptoKey || acceptedFiles.length === 0 || isUploadingRef.current) return;
    
    isUploadingRef.current = true;
    setUploading(true);
    if (onUploadingStateChange) onUploadingStateChange(true);
    
    try {
      let isCloudSyncFailedGlobal = false;
      const userDocRef = doc(dbPrimary, 'users', user.uid);

      const uniqueFiles = Array.from(
        new Map(acceptedFiles.map(f => [f.name + '_' + f.size, f])).values()
      );

      for (const file of uniqueFiles) {
        if (file.size > 1024 * 1024 * 1024) {
          throw new Error(`O arquivo "${file.name}" excede o limite individual máximo permitido de 1 GB.`);
        }
      }

      const uploadBaseTime = Date.now();

      for (let index = 0; index < uniqueFiles.length; index++) {
        const file = uniqueFiles[index];
        const isVideo = file.type.startsWith('video/');
        const fileLabel = `${index + 1}/${uniqueFiles.length}`;

        const prep = await prepareMediaFile(
          file,
          isVideo,
          fileLabel,
          cryptoKey,
          setProgressText
        );

        const itemCreatedAt = uploadBaseTime + (uniqueFiles.length - index) * 1000;

        await saveImageToCache({
          id: prep.newId,
          ciphertext: prep.encryptedFull.ciphertext,
          iv: prep.encryptedFull.iv,
          createdAt: itemCreatedAt,
          isChunked: false,
          chunkCount: 1,
          contentType: prep.processedFile.type,
          totalSize: prep.processedFile.size,
          thumbnailCiphertext: prep.thumbnailCiphertext,
          thumbnailIv: prep.thumbnailIv,
          fileKeyCiphertext: prep.encryptedKey.ciphertext,
          fileKeyIv: prep.encryptedKey.iv,
          fileSalt: prep.fileSalt
        });

        const uploadResult = await uploadToCofreAndFirestore({
          user,
          newId: prep.newId,
          processedFile: prep.processedFile,
          isVideo,
          itemCreatedAt,
          encryptedFull: prep.encryptedFull,
          thumbnailCiphertext: prep.thumbnailCiphertext,
          thumbnailIv: prep.thumbnailIv,
          encryptedKey: prep.encryptedKey,
          fileSalt: prep.fileSalt,
          fileKey: prep.fileKey,
          setProgressText,
          fileLabel,
        });

        if (uploadResult.isCloudSyncFailed) {
          isCloudSyncFailedGlobal = true;
        } else {
          try {
            await updateDoc(userDocRef, {
              storageUsed: increment(uploadResult.finalSize)
            });
          } catch (stErr) {
            console.warn('Erro ao incrementar cota de armazenamento:', stErr);
          }
        }

        // Only dispatch refresh after R2 upload and Firestore document persistence have completed
        window.dispatchEvent(new CustomEvent('refresh-gallery-list'));
      }

      if (isCloudSyncFailedGlobal) {
        showToast(
          !navigator.onLine
            ? 'Salvo no cofre local (Modo offline).'
            : 'Salvo localmente no cofre.',
          'success'
        );
      } else {
        sendNativeNotification(
          "Upload Concluído",
          `${uniqueFiles.length === 1 ? 'Sua foto foi' : 'Suas fotos foram'} criptografadas e salvas com sucesso!`
        );
      }

      window.dispatchEvent(new CustomEvent('refresh-gallery-list'));

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error uploading media:', error);
      showToast('Erro ao enviar para o servidor.', 'error');
    } finally {
      isUploadingRef.current = false;
      setUploading(false);
      setProgressText('');
      if (onUploadingStateChange) onUploadingStateChange(false);
    }
  }, [user, cryptoKey, onComplete, onUploadingStateChange]);

  const lastProcessedFiles = useRef<File[]>([]);

  useEffect(() => {
    if (initialFiles.length > 0 && initialFiles !== lastProcessedFiles.current) {
      lastProcessedFiles.current = initialFiles;
      onDrop(initialFiles);
    }
  }, [initialFiles, onDrop]);

  return {
    uploading,
    progressText,
    toast,
    setToast,
    onDrop,
  };
}
