import { User } from 'firebase/auth';
import { getApiUrl } from '../../../utils/apiUrl';
import { decryptProtectedThumbnail } from './thumbnailDecryptor';
import { ProtectedImageItem } from './types';

/**
 * Tentativa automática de reparo remoto de thumbnail corrompida
 */
export async function repairProtectedThumbnail(
  img: ProtectedImageItem,
  combinedKey: CryptoKey,
  user: User | null
): Promise<{ finalImg: ProtectedImageItem; decryptedUrl: string; failed: boolean }> {
  let finalImg = img;
  let decryptedUrl = '';
  let failed = true;

  if (sessionStorage.getItem(`repaired_img_${img.id}`)) {
    return { finalImg, decryptedUrl, failed };
  }

  sessionStorage.setItem(`repaired_img_${img.id}`, 'true');
  try {
    const token = user ? await user.getIdToken() : undefined;
    const repRes = await fetch(
      getApiUrl(`/api/storage/protected-images?userId=${user?.uid}&repairId=${img.id}`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (repRes.ok) {
      const repData = await repRes.json().catch(() => null);
      if (repData && repData.success && Array.isArray(repData.images)) {
        const repairedItem = repData.images.find((x: any) => x.id === img.id);
        if (repairedItem) {
          finalImg = repairedItem;
          const res = await decryptProtectedThumbnail(repairedItem, combinedKey);
          decryptedUrl = res.decryptedUrl;
          failed = res.failed;
        }
      }
    }
  } catch (repErr) {
    console.warn('Failed automatic repair for protected image:', img.id, repErr);
  }

  return { finalImg, decryptedUrl, failed };
}
