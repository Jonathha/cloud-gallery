import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveImageToCache, removeKeyFromLocal } from '../utils/db';
import { ToastType } from '../components/Toast';
import { sendNativeNotification } from '../utils/nativeNotifications';
import { prepareMediaFile } from './useImageUploader/mediaPrepare';
import { uploadToCofreAndFirestore } from './useImageUploader/uploadServer';
import { saveThumbnailToQuickAccessCache } from '../utils/quickAccessCache';
import { sessionDecryptedCache, enforceDataPrefix } from './gallery/decrypt/sessionCache';
import { fetchVaultConfigApi } from '../services/vaultApiService';
import { recordAuditEvent } from '../services/adminAuditService';
import { emitUploadProgress } from '../components/gallery/UploadProgressIndicator';
import { saveAspectRatio } from '../utils/aspectRatioCache';

const MAX_FILE_BYTES = 1024 * 1024 * 1024;

// A verificação do cofre é uma chamada de rede sem limite de tempo: se travar, o envio ficava mudo.
// Ao estourar devolve null e o envio segue (igual ao que o catch já fazia quando a verificação falha).
const VAULT_CHECK_TIMEOUT_MS = 4000;
function withTimeoutOrNull<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

// Motivo curto e legível para o resumo de falhas (o erro cru pode ser técnico ou nem ter mensagem).
function failureReason(err: any): string {
  const msg = err?.message;
  return typeof msg === 'string' && msg.trim() ? msg.trim() : 'erro ao processar o arquivo';
}

export function useImageUploaderLogic(
  onComplete?: () => void,
  onUploadingStateChange?: (isUploading: boolean) => void,
  initialFiles: File[] = []
) {
  const { user, cryptoKey } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const isUploadingRef = useRef(false);
  // Posição atual do lote (n/total) para o indicador mini no topo da tela.
  const progressMetaRef = useRef({ current: 0, total: 0 });
  // Arquivos escolhidos enquanto outro envio roda: entram numa fila em vez de serem descartados.
  const queuedFilesRef = useRef<File[][]>([]);
  const onDropRef = useRef<(files: File[]) => Promise<void>>(async () => {});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    window.dispatchEvent(new CustomEvent('show-app-toast', {
      detail: { message, type }
    }));
  };

  // Atualiza o texto de progresso e avisa o indicador mini do topo da tela.
  const reportProgress = (text: string) => {
    setProgressText(text);
    emitUploadProgress({ active: true, text, current: progressMetaRef.current.current, total: progressMetaRef.current.total });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !cryptoKey || acceptedFiles.length === 0) return;

    // Já existe um envio em andamento: guarda na fila (antes esses arquivos eram ignorados em silêncio).
    if (isUploadingRef.current) {
      queuedFilesRef.current.push(acceptedFiles);
      showToast('Adicionado à fila de envio.', 'info');
      return;
    }
    
    isUploadingRef.current = true;
    setUploading(true);
    if (onUploadingStateChange) onUploadingStateChange(true);
    // O indicador aparece já ao escolher os arquivos (antes ficava mudo até a verificação de rede terminar).
    progressMetaRef.current = { current: 1, total: acceptedFiles.length };
    emitUploadProgress({ active: true, text: 'Preparando envio…', current: 1, total: acceptedFiles.length });

    try {
      // Verificação de segurança cirúrgica: impede upload se a senha foi alterada em outro dispositivo
      if (navigator.onLine && user && !user.uid.startsWith("offline_user")) {
        try {
          const remoteConfig = await withTimeoutOrNull(fetchVaultConfigApi(user), VAULT_CHECK_TIMEOUT_MS);
          const activeSalt = sessionStorage.getItem(`vault_active_salt_${user.uid}`);
          if (remoteConfig && activeSalt && remoteConfig.salt !== activeSalt) {
            await removeKeyFromLocal(user.uid);
            sessionStorage.removeItem(`vault_active_salt_${user.uid}`);
            showToast("Sua senha do cofre foi alterada em outro dispositivo. Envio cancelado.", "error");
            queuedFilesRef.current = [];
            window.location.reload();
            return;
          }
        } catch (e) {}
      }

      let isCloudSyncFailedGlobal = false;

      const dedupedFiles = Array.from(
        new Map(acceptedFiles.map(f => [f.name + '_' + f.size, f])).values()
      );

      // Falhas por arquivo: um arquivo ruim não cancela mais o lote inteiro.
      const failures: { name: string; reason: string }[] = [];
      let uploadedCount = 0;

      const uniqueFiles = dedupedFiles.filter(f => {
        if (f.size > MAX_FILE_BYTES) {
          failures.push({ name: f.name, reason: 'excede o limite de 1 GB' });
          return false;
        }
        return true;
      });

      progressMetaRef.current = { current: 1, total: uniqueFiles.length };
      emitUploadProgress({ active: true, text: 'Preparando envio…', current: 1, total: uniqueFiles.length });

      let lastCreatedAt = 0;

      for (let index = 0; index < uniqueFiles.length; index++) {
        const file = uniqueFiles[index];
        const isVideo = file.type.startsWith('video/');
        const fileLabel = `${index + 1}/${uniqueFiles.length}`;
        progressMetaRef.current.current = index + 1;
        try {

          const prep = await prepareMediaFile(
            file,
            isVideo,
            fileLabel,
            cryptoKey,
            reportProgress
          );

          const itemCreatedAt = Math.max(Date.now(), lastCreatedAt + 1);
          lastCreatedAt = itemCreatedAt;

          await saveImageToCache({
            id: prep.newId,
            userId: user?.uid,
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
            fileSalt: prep.fileSalt,
            isLocalPending: true
          });

          // Persist thumbnail to Quick Access immediately so the photo appears in the gallery instantly
          if (prep.thumbnailBase64) {
            const finalDataUrl = enforceDataPrefix(prep.thumbnailBase64, prep.processedFile.type);
            sessionDecryptedCache.set(prep.newId, finalDataUrl);
            const ratio = prep.width > 0 && prep.height > 0 ? prep.width / prep.height : undefined;
            // Grava a proporção real antes do refresh: a célula já nasce no tamanho certo (sem pulo 1:1 -> real)
            if (ratio) saveAspectRatio(prep.newId, ratio);
            saveThumbnailToQuickAccessCache(user.uid, prep.newId, finalDataUrl, cryptoKey, ratio).catch(() => {});
          }

          // Refresh gallery immediately so the photo shows up right away on the device
          window.dispatchEvent(new CustomEvent('refresh-gallery-list'));

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
            setProgressText: reportProgress,
            fileLabel,
            width: prep.width,
            height: prep.height,
            duration: prep.duration,
          });

          if (uploadResult.serverCreatedAt) lastCreatedAt = Math.max(lastCreatedAt, uploadResult.serverCreatedAt);

          if (uploadResult.isCloudSyncFailed) {
            isCloudSyncFailedGlobal = true;
          }

          const effectiveSize = uploadResult.finalSize || prep.processedFile.size || file.size;
          const effectiveType = prep.processedFile.type || file.type || (isVideo ? 'video/webm' : 'image/jpeg');
          recordAuditEvent({
            type: 'file_upload',
            action: 'file_upload',
            userId: user?.uid,
            userEmail: user?.email || '',
            fileName: file.name,
            mediaType: effectiveType,
            fileSize: effectiveSize,
            itemCount: 1,
            resourceId: prep.newId,
            result: uploadResult.isCloudSyncFailed
              ? 'Salvo no cofre local (sincronização com o servidor pendente)'
              : 'Upload concluído e criptografado com sucesso',
            status: uploadResult.isCloudSyncFailed ? 'warning' : 'success',
            details: `Upload do arquivo "${file.name}" (${effectiveType}, ${(effectiveSize / 1024).toFixed(1)} KB) — ID: ${prep.newId}`
          });

          // Final refresh after cloud persistence completes
          window.dispatchEvent(new CustomEvent('refresh-gallery-list'));
          uploadedCount++;
        } catch (fileErr: any) {
          console.error(`Error uploading file "${file.name}":`, fileErr);
          failures.push({ name: file.name, reason: failureReason(fileErr) });
        }
      }

      if (queuedFilesRef.current.length === 0) emitUploadProgress({ active: false });

      if (isCloudSyncFailedGlobal || failures.length > 0) {
        // O listener revalida o cache: só abre se houver item realmente pendente
        window.dispatchEvent(new CustomEvent('show-backup-alert'));
      }

      if (failures.length > 0) {
        failures.forEach(f => console.warn(`Falha no envio de "${f.name}": ${f.reason}`));
        showToast(
          failures.length === 1
            ? `Não enviou "${failures[0].name}": ${failures[0].reason}.`
            : `${uploadedCount} de ${uploadedCount + failures.length} enviados. ${failures.length} falharam.`,
          'error'
        );
      } else if (isCloudSyncFailedGlobal) {
        showToast(
          !navigator.onLine
            ? 'Salvo no cofre local (Modo offline).'
            : 'Salvo localmente no cofre.',
          'info'
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
      if (queuedFilesRef.current.length === 0) emitUploadProgress({ active: false });
      if (onUploadingStateChange) onUploadingStateChange(false);

      // Continua sozinho com o que foi escolhido durante este envio (um único lote).
      const queued = queuedFilesRef.current.splice(0);
      if (queued.length > 0) {
        const next = ([] as File[]).concat(...queued);
        setTimeout(() => { void onDropRef.current(next); }, 0);
      }
    }
  }, [user, cryptoKey, onComplete, onUploadingStateChange]);
  onDropRef.current = onDrop;

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
