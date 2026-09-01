import React, { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { dbPrimary } from '../../firebase';
import { DecryptedImage } from '../../types';
import { getImageFromCache, removeImageFromCache } from '../../utils/db';
import { fetchAndUnpackImage } from '../../utils/fileCrypto';
import { getApiUrl } from '../../utils/apiUrl';

export function useGalleryProtection(
  user: any,
  cryptoKey: CryptoKey | null,
  extraPassword: string | null,
  images: DecryptedImage[],
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
) {
  useEffect(() => {
    const handleProtect = async (e: any) => {
      const id = e.detail.id;
      if (!extraPassword) {
        showToast('Configure a Senha Extra nas Configurações primeiro.', 'error');
        return;
      }
      
      const img = images.find(i => i.id === id);
      if (!img) return;

      try {
        showToast('Protegendo imagem...', 'info');
        
        const { generateAuxiliaryKey, deriveKey, encryptData, decryptData } = await import('../../utils/crypto');
        const { decryptFileKey, encryptFileKey } = await import('../../utils/fileCrypto');

        // 1. Generate 16-char auxiliary key
        const auxKey = generateAuxiliaryKey();

        // 2. Derive strong key (extraPassword + auxKey)
        const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0')); 
        const combinedKey = await deriveKey(extraPassword, salt);

        // 3. Save aux key to Firestore
        const { serverTimestamp } = await import('firebase/firestore');
        await setDoc(doc(dbPrimary, 'media_keys', img.id), {
          userId: user!.uid,
          auxKey,
          protectedAt: serverTimestamp(),
          createdAt: img.createdAt || serverTimestamp()
        });

        // 4. Get the encrypted image details from local cache or fetch from server
        let fileData = await getImageFromCache(img.id);
        if (!fileData || (!fileData.ciphertext && !fileData.fileKeyCiphertext)) {
          try {
            const token = user ? await user.getIdToken() : undefined;
            fileData = await fetchAndUnpackImage(img.id, token);
          } catch (fetchErr) {
            console.warn('Erro ao buscar imagem no servidor:', fetchErr);
          }
        }

        if (!fileData || (!fileData.ciphertext && !fileData.fileKeyCiphertext)) {
          throw new Error('Não foi possível obter os dados criptografados da imagem.');
        }

        // 5. Decrypt original image/key and re-encrypt with combined key
        let newCiphertext = fileData.ciphertext;
        let newIv = fileData.iv;
        let newThumbCipher = fileData.thumbnailCiphertext;
        let newThumbIv = fileData.thumbnailIv;
        let newFileKeyCiphertext = fileData.fileKeyCiphertext;
        let newFileKeyIv = fileData.fileKeyIv;

        if (fileData.fileKeyCiphertext && fileData.fileKeyIv) {
          // New envelope encryption format
          // Decrypt the file key using the master cryptoKey
          const fileKeyStr = await decryptFileKey(fileData.fileKeyCiphertext, fileData.fileKeyIv, cryptoKey!);
          // Re-encrypt the file key using the new combinedKey (which is a CryptoKey but encryptFileKey expects CryptoKey)
          const encryptedKey = await encryptFileKey(fileKeyStr, combinedKey);
          newFileKeyCiphertext = encryptedKey.ciphertext;
          newFileKeyIv = encryptedKey.iv;
        } else {
          // Legacy format (no file key)
          if (fileData.ciphertext && fileData.ciphertext !== 'chunked_vault_data') {
            const original = await decryptData(fileData.ciphertext as string, fileData.iv, cryptoKey!);
            const encrypted = await encryptData(original, combinedKey);
            newCiphertext = encrypted.ciphertext;
            newIv = encrypted.iv;
          } else if (fileData.ciphertext === 'chunked_vault_data') {
            newCiphertext = 'chunked_vault_data';
            newIv = fileData.iv;
          }

          if (fileData.thumbnailCiphertext) {
            const originalThumb = await decryptData(fileData.thumbnailCiphertext, fileData.thumbnailIv, cryptoKey!);
            const encryptedThumb = await encryptData(originalThumb, combinedKey);
            newThumbCipher = encryptedThumb.ciphertext;
            newThumbIv = encryptedThumb.iv;
          }
        }

        // 6. Upload to Express as protected
        const payload = {
          id: img.id,
          userId: user!.uid,
          ciphertext: newCiphertext,
          iv: newIv,
          contentType: img.contentType,
          totalSize: img.totalSize,
          thumbnailCiphertext: newThumbCipher,
          thumbnailIv: newThumbIv,
          fileKeyCiphertext: newFileKeyCiphertext,
          fileKeyIv: newFileKeyIv,
          fileSalt: fileData.fileSalt,
          isChunked: img.isChunked,
          chunkCount: img.chunkCount,
          isProtected: true
        };

        const token = await user.getIdToken();
        const uploadRes = await fetch(getApiUrl('/api/storage/upload'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!uploadRes.ok) throw new Error('Falha ao salvar imagem protegida');

        // 7. Remove from local cache and state
        await removeImageFromCache(img.id);
        setImages(prev => prev.filter(i => i.id !== img.id));

        showToast('Imagem protegida com sucesso!');
        
        // Dispatch an event so ProtectedGallery can reload
        window.dispatchEvent(new Event('refresh-protected-gallery'));
      } catch (err: any) {
        console.error(err);
        showToast('Erro ao proteger imagem.', 'error');
      }
    };

    window.addEventListener('protect-image', handleProtect);
    return () => window.removeEventListener('protect-image', handleProtect);
  }, [images, extraPassword, cryptoKey, user, setImages, showToast]);
}
