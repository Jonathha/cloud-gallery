import { compressVideo, generateImageThumbnail, generateVideoThumbnail } from '../../utils/media';
import { generateFileKey, encryptWithFileKey, encryptFileKey } from '../../utils/fileCrypto';

export async function prepareMediaFile(
  file: File,
  isVideo: boolean,
  fileLabel: string,
  cryptoKey: any,
  setProgressText: (text: string) => void
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
  
  const fileKey = generateFileKey();

  setProgressText(`Gerando miniatura (${fileLabel})...`);
  const thumbnailBase64 = isVideo 
    ? await generateVideoThumbnail(processedFile) 
    : await generateImageThumbnail(processedFile);

  let thumbnailCiphertext = '';
  let thumbnailIv = '';
  let fileSalt = '';

  if (thumbnailBase64) {
    const thumbEnc = await encryptWithFileKey(thumbnailBase64, fileKey);
    thumbnailCiphertext = thumbEnc.ciphertext;
    thumbnailIv = thumbEnc.iv;
    fileSalt = thumbEnc.fileSalt;
  }

  setProgressText(`Preparando criptografia local (${fileLabel})...`);
  const fullBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(processedFile);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const encryptedFull = await encryptWithFileKey(fullBase64, fileKey, fileSalt);
  if (!fileSalt) fileSalt = encryptedFull.fileSalt;

  const encryptedKey = await encryptFileKey(fileKey, cryptoKey);

  return {
    processedFile,
    newId,
    fileKey,
    thumbnailCiphertext,
    thumbnailIv,
    fileSalt,
    encryptedFull,
    encryptedKey,
  };
}
