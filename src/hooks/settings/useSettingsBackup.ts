import { getAllImagesFromCache } from '../../utils/db';
import { getApiUrl } from '../../utils/apiUrl';
import { decryptData } from '../../utils/crypto';
import { decryptFileKey, decryptWithFileKey } from '../../utils/fileCrypto';
import { User } from 'firebase/auth';

export function useSettingsBackup(
  user: User | null,
  cryptoKey: CryptoKey | null,
  setDownloading: (downloading: boolean) => void,
  showToast: (message: string, type?: any) => void
) {
  const handleDownloadAll = async () => {
    if (!cryptoKey) {
      showToast('Chave de criptografia não disponível', 'error');
      return;
    }
    setDownloading(true);
    try {
      const cachedImages = await getAllImagesFromCache();
      if (cachedImages.length === 0) {
        showToast('Nenhuma imagem no cache', 'info');
        return;
      }
      
      for (const img of cachedImages) {
        if (img.ciphertext && img.iv) {
          let decryptedBase64 = '';
          if (img.fileKeyCiphertext && img.fileKeyIv && img.fileSalt) {
            try {
              const fileKeyStr = await decryptFileKey(img.fileKeyCiphertext, img.fileKeyIv, cryptoKey);
              decryptedBase64 = await decryptWithFileKey(img.ciphertext as string, img.iv, fileKeyStr, img.fileSalt);
            } catch (e) {
              console.error('Download decryption failed', e);
              decryptedBase64 = await decryptData(img.ciphertext as string, img.iv, cryptoKey);
            }
          } else {
            decryptedBase64 = await decryptData(img.ciphertext as string, img.iv, cryptoKey);
          }
          
          if (!decryptedBase64.startsWith('data:') && !decryptedBase64.startsWith('blob:')) {
            decryptedBase64 = `data:${img.contentType || "image/jpeg"};base64,${decryptedBase64}`;
          }

          const link = document.createElement('a');
          link.href = decryptedBase64;
          link.download = `image-${img.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      showToast('Download iniciado...');
    } catch (error) {
      console.error('Erro ao baixar imagens:', error);
      showToast('Erro ao baixar imagens', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return { handleDownloadAll };
}
