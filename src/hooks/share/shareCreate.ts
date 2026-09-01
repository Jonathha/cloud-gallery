import { generateRandomKey, exportKeyToBase64, encryptData, deriveKey, generateSalt } from '../../utils/crypto';

export async function getDecryptedImageBlob(decryptedImageUrl: string): Promise<Blob> {
  try {
    const response = await fetch(decryptedImageUrl);
    return await response.blob();
  } catch (fErr) {
    console.error('Error fetching decrypted image URL, attempting fallback:', fErr);
    if (decryptedImageUrl.includes('base64,')) {
      const parts = decryptedImageUrl.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'image/png';
      const base64Str = parts[1];
      const binary = atob(base64Str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: contentType });
    } else {
      const binary = atob(decryptedImageUrl);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'image/png' });
    }
  }
}

export function readBlobAsDataUrl(fileBlob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileBlob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = e => reject(e);
  });
}

export interface BuildShareParams {
  imageId: string;
  userId: string;
  decryptedImageUrl: string;
  requirePassword: boolean;
  password: string;
  allowDownload: boolean;
  oneTimeView: boolean;
  linkDuration: '1h' | 'permanent';
}

export interface BuildShareResult {
  shareDocData: any;
  finalUrl: string;
  shareId: string;
  shareKeyBase64: string;
}

export async function buildSharePayload(params: BuildShareParams): Promise<BuildShareResult> {
  const { imageId, userId, decryptedImageUrl, requirePassword, password, allowDownload, oneTimeView, linkDuration } = params;
  const shareKey = await generateRandomKey();
  const shareKeyBase64 = await exportKeyToBase64(shareKey);
  const fileBlob = await getDecryptedImageBlob(decryptedImageUrl);
  const totalSize = fileBlob.size;
  const contentTypeToSave = fileBlob.type || 'image/png';
  const base64Data = await readBlobAsDataUrl(fileBlob);
  const encryptResult = await encryptData(base64Data, shareKey);
  const ciphertextToSave = encryptResult.ciphertext;
  const ivToSave = encryptResult.iv;

  const shareIdArray = new Uint8Array(16);
  crypto.getRandomValues(shareIdArray);
  const shareId = Array.from(shareIdArray, b => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = linkDuration === '1h' ? new Date(Date.now() + 3600000) : null;

  let optionsPayload: any = {
    requirePassword,
    allowDownload,
    oneTimeView,
    expiresAt,
    encryptedShareKey: null,
    ivShareKey: null
  };

  let finalUrl = '';
  if (requirePassword) {
    const salt = await generateSalt();
    const derivedKey = await deriveKey(password, salt);
    const encryptedKeyResult = await encryptData(shareKeyBase64, derivedKey);
    optionsPayload.encryptedShareKey = encryptedKeyResult.ciphertext + '|' + salt;
    optionsPayload.ivShareKey = encryptedKeyResult.iv;
    finalUrl = `${window.location.origin}/?share=${shareId}`;
  } else {
    finalUrl = `${window.location.origin}/?share=${shareId}#${encodeURIComponent(shareKeyBase64)}`;
  }

  const shareDocData = {
    id: shareId,
    imageId,
    userId,
    ciphertext: ciphertextToSave,
    iv: ivToSave,
    isChunked: false,
    chunkCount: 1,
    contentType: contentTypeToSave,
    totalSize: totalSize,
    options: {
      requirePassword: !!optionsPayload.requirePassword,
      encryptedShareKey: optionsPayload.encryptedShareKey,
      ivShareKey: optionsPayload.ivShareKey,
      allowDownload: oneTimeView ? false : !!optionsPayload.allowDownload,
      oneTimeView: optionsPayload.oneTimeView,
      expiresAt: optionsPayload.expiresAt ? optionsPayload.expiresAt.getTime() : null
    },
    createdAt: Date.now(),
    firstViewedAt: null,
    firstViewerIp: null
  };

  return { shareDocData, finalUrl, shareId, shareKeyBase64 };
}
