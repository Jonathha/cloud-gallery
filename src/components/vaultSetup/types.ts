export type VaultEncryptionMode = 'standard' | 'custom_extra';

export interface VaultSetupValidationResult {
  valid: boolean;
  error?: string;
}

export function validateVaultSetup(
  pin: string,
  confirmPin: string,
  mode: VaultEncryptionMode,
  extraPassword: string,
  confirmExtraPassword: string
): VaultSetupValidationResult {
  if (pin.length < 6 || pin.length > 30) {
    return { valid: false, error: 'A Senha Mestre deve ter entre 6 e 30 caracteres.' };
  }
  if (pin !== confirmPin) {
    return { valid: false, error: 'As senhas mestras não coincidem.' };
  }

  if (mode === 'custom_extra') {
    if (!extraPassword || extraPassword.trim().length < 4) {
      return { valid: false, error: 'A Senha Extra deve ter no mínimo 4 caracteres.' };
    }
    if (extraPassword.length > 15) {
      return { valid: false, error: 'A Senha Extra deve ter no máximo 15 caracteres.' };
    }
    if (extraPassword === pin) {
      return { valid: false, error: 'A Senha Extra deve ser diferente da Senha Mestre para garantir segurança real.' };
    }
    if (extraPassword !== confirmExtraPassword) {
      return { valid: false, error: 'As senhas extras não coincidem.' };
    }
  }

  return { valid: true };
}
