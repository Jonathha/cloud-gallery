import { User } from 'firebase/auth';
import { encryptData } from '../../../utils/crypto';
import { updateVaultSettingsApi } from '../../../services/vaultApiService';
import { updateLocalVaultCache } from './helpers';
import { recordAuditEvent } from '../../../services/adminAuditService';

export async function updateExtraPasswordLogic(
  password: string,
  user: User,
  cryptoKey: CryptoKey,
  setExtraPassword: (pwd: string | null) => void
): Promise<void> {
  try {
    const encrypted = await encryptData(password, cryptoKey);
    const now = Date.now();

    try {
      await updateVaultSettingsApi(user, {
        extraPassword: encrypted,
        extraPasswordUpdatedAt: now
      });
    } catch (error) {
      console.warn('Falha ao salvar senha extra na nuvem, salvando apenas localmente:', error);
    }

    setExtraPassword(password);
    updateLocalVaultCache(user.uid, {
      extraPassword: encrypted,
      extraPasswordUpdatedAt: now
    });
    recordAuditEvent({
      type: 'extra_password_change',
      action: 'extra_password_change',
      userId: user.uid,
      userEmail: user.email || '',
      result: 'Senha extra de segurança atualizada com sucesso',
      status: 'success',
      details: 'Atualização da senha extra de proteção do cofre'
    }).catch(() => {});
  } catch (error) {
    console.error('Erro ao atualizar senha extra:', error);
  }
}
