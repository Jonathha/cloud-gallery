import { User } from 'firebase/auth';
import { deriveKey, decryptData } from '../../../utils/crypto';
import { fetchAndUnpackImage } from '../../../utils/fileCrypto';
import { getOrFetchAuxKey } from './auxKeyFetcher';
import { ProtectedImageItem } from './types';

export async function loadProtectedFullResolution(
  img: ProtectedImageItem,
  extraPassword: string,
  user: User | null
): Promise<string> {
  const auxKey = await getOrFetchAuxKey(img.id, user);
  if (!auxKey) {
    throw new Error('Chave de segurança não disponível para esta imagem.');
  }

  const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0'));
  const combinedKey = await deriveKey(extraPassword, salt);

  const token = user ? await user.getIdToken() : undefined;
  const fileData = await fetchAndUnpackImage(img.id, token);
  if (!fileData) {
    throw new Error('Mídia não encontrada no cofre.');
  }

  let decryptedUrl = '';
  if (fileData.fileKeyCiphertext && fileData.fileKeyIv) {
    const { decryptFileKey, decryptWithFileKey } = await import('../../../utils/fileCrypto');
    const fileKeyStr = await decryptFileKey(
      fileData.fileKeyCiphertext,
      fileData.fileKeyIv,
      combinedKey
    );
    decryptedUrl = await decryptWithFileKey(
      fileData.ciphertext,
      fileData.iv,
      fileKeyStr,
      fileData.fileSalt || img.fileSalt || ''
    );
  } else {
    decryptedUrl = await decryptData(
      fileData.ciphertext,
      fileData.iv,
      combinedKey
    );
  }

  if (!decryptedUrl.startsWith('data:') && !decryptedUrl.startsWith('blob:')) {
    decryptedUrl = `data:${fileData.contentType || 'image/jpeg'};base64,${decryptedUrl}`;
  }

  return decryptedUrl;
}
