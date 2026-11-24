import { compressVideo, generateImageThumbnail, generateVideoThumbnail } from '../../utils/media';
import { generateFileKey, encryptWithFileKey, encryptFileKey, encryptWithFileKeyRaw } from '../../utils/fileCrypto';
import { saveMediaDimensions } from '../../utils/aspectRatioCache';

export async function prepareMediaFile(
  file: File,
  isVideo: boolean,
  fileLabel: string,
  cryptoKey: any,
  setProgressText: (text: string) => void,
  existingFileKey?: string,
  existingFileSalt?: string
) {
  let processedFile = file;

  if (isVideo) {
    setProgressText(`Otimizando vídeo (${fileLabel})...`);
    processedFile = await compressVideo(file, (pct) => {
      setProgressText(`Compactando vídeo (${fileLabel}): ${Math.round(pct * 100)}%`);
    });
  } else {
    setProgressText(`Preparando foto (${fileLabel})...`);
  }

  const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  
  const fileKey = existingFileKey || generateFileKey();
  let fileSalt = existingFileSalt || '';

  setProgressText(`Gerando miniatura (${fileLabel})...`);
  const thumbnailBase64 = isVideo 
    ? await generateVideoThumbnail(processedFile) 
    : await generateImageThumbnail(processedFile);

  let thumbnailCiphertext = '';
  let thumbnailIv = '';

  if (thumbnailBase64) {
    const thumbEnc = await encryptWithFileKey(thumbnailBase64, fileKey, fileSalt);
    thumbnailCiphertext = thumbEnc.ciphertext;
    thumbnailIv = thumbEnc.iv;
    if (!fileSalt) fileSalt = thumbEnc.fileSalt;
  }

  setProgressText(`Preparando criptografia local (${fileLabel})...`);
  let encryptedFullRaw: { rawCiphertext: ArrayBuffer; iv: string; fileSalt: string };
  if (!isVideo && (existingFileKey || fileLabel === "Recuperação")) {
    const fileBuffer = await processedFile.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    encryptedFullRaw = await encryptWithFileKeyRaw(fileBytes, fileKey, fileSalt);
  } else {
    let fullBase64: string | null = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(processedFile);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

    encryptedFullRaw = await encryptWithFileKeyRaw(fullBase64, fileKey, fileSalt);
    fullBase64 = null; // Clear huge base64 string from memory immediately for memory optimization
  }
  if (!fileSalt) fileSalt = encryptedFullRaw.fileSalt;

  const encryptedFull = {
    get ciphertext() {
      if (!this._cachedCiphertext) {
        const bytes = new Uint8Array(encryptedFullRaw.rawCiphertext);
        const CHUNK_SIZE = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(i, i + CHUNK_SIZE);
          binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        this._cachedCiphertext = btoa(binary);
      }
      return this._cachedCiphertext;
    },
    _cachedCiphertext: null as string | null,
    iv: encryptedFullRaw.iv,
    fileSalt: encryptedFullRaw.fileSalt,
    rawCiphertext: encryptedFullRaw.rawCiphertext
  };

  const encryptedKey = await encryptFileKey(fileKey, cryptoKey);

  // Extract dimensions and duration safely
  let width = 0;
  let height = 0;
  let duration = 0;

  if (isVideo) {
    try {
      const vidMeta = await new Promise<{ width: number; height: number; duration: number }>((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        const u = URL.createObjectURL(processedFile);
        video.src = u;
        // Em alguns navegadores nenhum dos dois eventos dispara (ex.: codec sem suporte):
        // sem este limite o envio ficava pendurado aqui para sempre.
        const metaTimer = setTimeout(() => {
          resolve({ width: 0, height: 0, duration: 0 });
          URL.revokeObjectURL(u);
        }, 8000);
        video.onloadedmetadata = () => {
          clearTimeout(metaTimer);
          resolve({
            width: video.videoWidth || 0,
            height: video.videoHeight || 0,
            duration: video.duration || 0
          });
          URL.revokeObjectURL(u);
        };
        video.onerror = () => {
          clearTimeout(metaTimer);
          resolve({ width: 0, height: 0, duration: 0 });
          URL.revokeObjectURL(u);
        };
      });
      width = vidMeta.width;
      height = vidMeta.height;
      duration = vidMeta.duration;
    } catch (e) {
      console.warn("Failed to get video metadata:", e);
    }
  } else {
    try {
      const dim = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(processedFile);
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0 });
          URL.revokeObjectURL(img.src);
        };
      });
      width = dim.width;
      height = dim.height;
    } catch (e) {
      console.warn("Failed to get image dimensions:", e);
    }
  }

  if (width > 0 && height > 0) {
    saveMediaDimensions(newId, width, height, duration > 0 ? duration : undefined);
  }

  return {
    processedFile,
    newId,
    fileKey,
    thumbnailBase64,
    thumbnailCiphertext,
    thumbnailIv,
    fileSalt,
    encryptedFull,
    encryptedKey,
    width,
    height,
    duration,
  };
}
