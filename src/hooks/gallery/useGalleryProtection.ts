import React, { useEffect } from 'react';
import { DecryptedImage } from '../../types';
import { protectImageItem } from './protection/saveProtectedMedia';

export function useGalleryProtection(
  user: any, cryptoKey: CryptoKey | null, extraPassword: string | null,
  images: DecryptedImage[], setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
) {
  useEffect(() => {
    const handleProtect = async (e: any) => {
      const id = e.detail?.id;
      if (!extraPassword) { showToast('Configure a Senha Extra nas Configurações primeiro.', 'error'); return; }
      const img = images.find(i => i.id === id);
      if (!img || !cryptoKey || !user) return;
      try {
        showToast('Protegendo imagem...', 'info');
        await protectImageItem(img, user, cryptoKey, extraPassword);
        setImages(prev => prev.filter(i => i.id !== img.id));
        showToast('Imagem protegida com sucesso!');
        window.dispatchEvent(new Event('refresh-protected-gallery'));
      } catch {
        showToast('Erro ao proteger imagem.', 'error');
      }
    };
    window.addEventListener('protect-image', handleProtect);
    return () => window.removeEventListener('protect-image', handleProtect);
  }, [images, extraPassword, cryptoKey, user, setImages, showToast]);
}
