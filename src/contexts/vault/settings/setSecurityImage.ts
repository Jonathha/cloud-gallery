import { User } from 'firebase/auth';
import { updateVaultSettingsApi } from '../../../services/vaultApiService';
import { revertProtectedImageLogic } from './revertProtectedImage';
import { protectNewImageLogic } from './protectNewImage';
import { updateLocalVaultCache } from './helpers';

export async function setSecurityImageLogic(
  imageId: string | null,
  user: User,
  cryptoKey: CryptoKey,
  extraPassword: string | null,
  securityImageId: string | null,
  setSecurityImageId: (id: string | null) => void,
  customExtraPassword?: string
): Promise<void> {
  const now = Date.now();
  const currentExtraPassword = customExtraPassword || extraPassword;

  if (securityImageId && securityImageId !== imageId) {
    await revertProtectedImageLogic(securityImageId, user, cryptoKey, currentExtraPassword);
  }

  if (imageId) {
    if (!currentExtraPassword) {
      throw new Error('Você precisa configurar uma Senha de Segurança nas Configurações primeiro.');
    }
    if (!cryptoKey) {
      throw new Error('Cofre bloqueado');
    }
    await protectNewImageLogic(imageId, user, cryptoKey, currentExtraPassword, now);
  }

  try {
    await updateVaultSettingsApi(user, {
      securityImageId: imageId,
      securityImageIdUpdatedAt: now
    });
  } catch (error) {
    console.warn('Falha ao salvar imagem protegida no D1, salvando apenas localmente:', error);
  }

  setSecurityImageId(imageId);
  updateLocalVaultCache(user.uid, {
    securityImageId: imageId,
    securityImageIdUpdatedAt: now
  });

  window.dispatchEvent(new Event('refresh-gallery-list'));
}
