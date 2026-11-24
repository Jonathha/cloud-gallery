import { User } from 'firebase/auth';
import { encryptData } from '../../../utils/crypto';
import { updateVaultSettingsApi } from '../../../services/vaultApiService';
import { updateLocalVaultCache } from './helpers';
import { recordAuditEvent } from '../../../services/adminAuditService';

export async function switchEncryptionModeLogic(
  targetMode: 'standard' | 'custom_extra',
  newExtraPasswordInput: string | null,
  user: User,
  cryptoKey: CryptoKey,
  setExtraPassword: (pwd: string | null) => void,
  setEncryptionModeState?: (mode: 'standard' | 'custom_extra') => void
): Promise<void> {
  const now = Date.now();
  let encryptedExtra = null;
  let finalExtraPasswordValue: string | null = null;

  if (targetMode === 'custom_extra') {
    if (!newExtraPasswordInput || newExtraPasswordInput.trim().length === 0) {
      throw new Error('Digite uma senha extra válida para ativar o modo de proteção dupla.');
    }
    finalExtraPasswordValue = newExtraPasswordInput.trim();
    encryptedExtra = await encryptData(finalExtraPasswordValue, cryptoKey);
  } else {
    finalExtraPasswordValue = null;
    encryptedExtra = null;
  }

  try {
    await updateVaultSettingsApi(user, {
      encryptionMode: targetMode,
      extraPassword: encryptedExtra,
      extraPasswordUpdatedAt: now
    });
  } catch (error) {
    console.warn('Falha ao atualizar modo de criptografia no D1, aplicando localmente:', error);
  }

  setExtraPassword(finalExtraPasswordValue);
  if (setEncryptionModeState) {
    setEncryptionModeState(targetMode);
  }

  updateLocalVaultCache(user.uid, {
    encryptionMode: targetMode,
    extraPassword: encryptedExtra,
    extraPasswordUpdatedAt: now
  });

  recordAuditEvent({
    type: 'encryption_mode_change',
    action: 'encryption_mode_change',
    userId: user.uid,
    userEmail: user.email || '',
    method: targetMode === 'custom_extra' ? 'Proteção Dupla (Custom Extra)' : 'Padrão (Standard)',
    result: `Modo de criptografia alterado para ${targetMode === 'custom_extra' ? 'Proteção Dupla' : 'Padrão'}`,
    status: 'success',
    details: `Modo de proteção do cofre alterado para: ${targetMode === 'custom_extra' ? 'Proteção Dupla' : 'Padrão'}`
  }).catch(() => {});
}
