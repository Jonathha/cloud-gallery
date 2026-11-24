import { getApiBaseUrl } from '../../utils/apiUrl';
import { saveImageToCache } from '../../utils/db';
import { packEncryptedFileV2 } from '../../utils/fileCrypto';
import { getSafeAuthToken } from '../../utils/safeAuthToken';

interface UploadServerParams {
  user: any;
  newId: string;
  processedFile: File;
  isVideo: boolean;
  itemCreatedAt: number;
  encryptedFull: { ciphertext: string; iv: string };
  thumbnailCiphertext: string;
  thumbnailIv: string;
  encryptedKey: { ciphertext: string; iv: string };
  fileSalt: string;
  fileKey: string;
  setProgressText: (text: string) => void;
  fileLabel: string;
  width?: number;
  height?: number;
  duration?: number;
}

const FALLBACK_WORKER_URL = "https://secure-vault-backend.jogonesteterp.workers.dev";

// Erros causados pela requisição/autorização: o worker de fallback responderia o mesmo,
// então reenviar o arquivo inteiro só dobraria a espera.
const NO_FALLBACK_STATUSES = new Set([400, 401, 403, 409, 413, 422, 429]);

// Tempo máximo do upload: 60s + 10s por MB (piso de ~100 KB/s).
// Sem limite, uma rede travada deixava o envio pendente para sempre (e bloqueava os próximos).
function uploadTimeoutMs(bytes: number): number {
  return 60_000 + Math.ceil(bytes / (1024 * 1024)) * 10_000;
}

async function postWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ res: Response | null; timedOut: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return { res, timedOut: false };
  } catch (err: any) {
    return { res: null, timedOut: err?.name === 'AbortError' };
  } finally {
    clearTimeout(timer);
  }
}

// Fallback só quando o host principal é outro, não estourou o tempo e o erro não é de requisição/autorização.
function shouldUseFallback(apiBase: string, res: Response | null, timedOut: boolean): boolean {
  if (apiBase === FALLBACK_WORKER_URL || timedOut) return false;
  if (!res) return true; // erro de rede
  return !res.ok && !NO_FALLBACK_STATUSES.has(res.status);
}

export async function uploadToCofreAndFirestore({
  user,
  newId,
  processedFile,
  isVideo,
  itemCreatedAt,
  encryptedFull,
  thumbnailCiphertext,
  thumbnailIv,
  encryptedKey,
  fileSalt,
  fileKey,
  setProgressText,
  fileLabel,
  width,
  height,
  duration,
}: UploadServerParams): Promise<{ isCloudSyncFailed: boolean; finalSize: number; serverCreatedAt?: number }> {
  let isCloudSyncFailed = false;
  let finalSize = processedFile.size;
  let serverCreatedAt: number | undefined;

  const uploadDate = new Date(itemCreatedAt || Date.now());
  const formattedDate = uploadDate.toLocaleDateString('pt-BR');
  const formattedTime = uploadDate.toLocaleTimeString('pt-BR');
  const isoUploadDate = uploadDate.toISOString();
  const fallbackExt = processedFile.type ? processedFile.type.split('/')[1]?.toUpperCase() || 'JPEG' : (isVideo ? 'WEBM' : 'JPEG');
  const fileExt = processedFile.name && processedFile.name.includes('.')
    ? processedFile.name.split('.').pop()?.toUpperCase() || fallbackExt
    : fallbackExt;

  if (!navigator.onLine) {
    isCloudSyncFailed = true;
  } else {
    try {
      const token = await getSafeAuthToken(user);
      if (!token) {
        throw new Error("Token de autenticação não disponível");
      }
      const apiBase = getApiBaseUrl();

      setProgressText(`Enviando para o cofre seguro (${fileLabel})...`);
      
      const cleanMetadata = {
        id: newId,
        userId: user.uid,
        iv: encryptedFull.iv,
        contentType: processedFile.type || (isVideo ? "video/webm" : "image/jpeg"),
        totalSize: processedFile.size,
        isChunked: false,
        chunkCount: 1,
        thumbnailCiphertext: "", // KEEP EMPTY IN HEADER TO PREVENT HTTP 500 (16KB HEADER LIMIT)
        thumbnailIv: thumbnailIv || "",
        fileKeyCiphertext: encryptedKey.ciphertext || "",
        fileKeyIv: encryptedKey.iv || "",
        fileSalt: fileSalt || "",
        // Dimensões originais: o Worker já persiste width/height/duration no D1 (antes chegavam 0)
        width: width || 0,
        height: height || 0,
        duration: duration || 0
      };

      // Pack thumbnail ciphertext + encrypted media into single ENC2 binary package
      const enc2Buffer = packEncryptedFileV2(
        cleanMetadata,
        thumbnailCiphertext || "",
        encryptedFull.ciphertext || ""
      );

      const uploadInit: RequestInit = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'X-File-Key': btoa(fileKey),
          'X-File-Salt': fileSalt,
          'X-File-Iv': encryptedFull.iv,
          'X-File-Metadata': btoa(unescape(encodeURIComponent(JSON.stringify(cleanMetadata))))
        },
        body: enc2Buffer
      };
      const timeoutMs = uploadTimeoutMs(enc2Buffer.byteLength);

      const primary = await postWithTimeout(`${apiBase}/api/storage/upload-raw`, uploadInit, timeoutMs);
      let uploadRes: Response | null = primary.res;
      let timedOut = primary.timedOut;
      if (!uploadRes) console.warn(timedOut ? 'Primary upload timed out' : 'Primary upload request failed');

      if (shouldUseFallback(apiBase, uploadRes, timedOut)) {
        const fallback = await postWithTimeout(`${FALLBACK_WORKER_URL}/api/storage/upload-raw`, uploadInit, timeoutMs);
        if (fallback.res) uploadRes = fallback.res; // se o fallback falhar, mantém a resposta do principal (mensagem de erro dele)
        timedOut = timedOut || fallback.timedOut;
        if (!fallback.res) console.warn(fallback.timedOut ? 'Fallback worker upload timed out' : 'Fallback worker upload failed');
      }

      if (!uploadRes || !uploadRes.ok) {
        const uploadErrData = uploadRes ? await uploadRes.json().catch(() => ({})) : {};
        throw new Error(uploadErrData.error || (timedOut ? 'Tempo esgotado no envio para o servidor' : 'Erro na resposta do servidor de upload'));
      }

      const resData = await uploadRes.clone().json().catch(() => ({}));
      if (resData.processedSize) finalSize = resData.processedSize;

      const officialServerTimestamp = Number(resData.createdAt || resData.timestamp) || Date.now();
      serverCreatedAt = officialServerTimestamp;
      const officialDate = new Date(officialServerTimestamp);
      const officialFormattedDate = officialDate.toLocaleDateString('pt-BR');
      const officialFormattedTime = officialDate.toLocaleTimeString('pt-BR');
      const officialIsoUploadDate = officialDate.toISOString();

      // Persist to local cache for instant zero-latency access
      await saveImageToCache({
        id: newId,
        userId: user.uid,
        ciphertext: encryptedFull.ciphertext,
        iv: encryptedFull.iv,
        createdAt: officialServerTimestamp,
        isChunked: false,
        chunkCount: 1,
        contentType: processedFile.type,
        totalSize: processedFile.size,
        thumbnailCiphertext,
        thumbnailIv,
        fileKeyCiphertext: encryptedKey.ciphertext,
        fileKeyIv: encryptedKey.iv,
        fileSalt
      });

    } catch (localUploadErr: any) {
      console.warn('Erro ao salvar no servidor de armazenamento:', localUploadErr);
      isCloudSyncFailed = true;
    }
  }

  return { isCloudSyncFailed, finalSize, serverCreatedAt };
}
