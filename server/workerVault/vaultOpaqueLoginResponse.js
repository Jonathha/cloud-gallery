import { parseStoredJson } from "./vaultEnv.js";

/**
 * Monta o payload completo de resposta para inicialização do login OPAQUE
 * @param {Object} row Registro do banco de dados D1
 * @param {string} loginResponse Resposta criptográfica OPAQUE do servidor
 * @param {string} serverLoginState Estado efêmero da sessão OPAQUE
 * @returns {Object} Payload formatado para o cliente
 */
export function buildOpaqueLoginResponse(row, loginResponse, serverLoginState) {
  const parsedEncryptedVaultKey = parseStoredJson(row.encrypted_vault_key);
  const parsedExtraPassword = parseStoredJson(row.extra_password);

  return {
    success: true,
    loginResponse,
    serverLoginState,
    encryptedVaultKey: parsedEncryptedVaultKey,
    encryptionMode: row.encryption_mode || "standard",
    extraPassword: parsedExtraPassword,
    extraPasswordUpdatedAt: row.extra_password_updated_at || 0,
    securityImageId: row.security_image_id || null,
    securityImageIdUpdatedAt: row.security_image_id_updated_at || 0,
    failedAttempts: row.failed_attempts || 0,
    lockedUntil: row.locked_until || null
  };
}

export function isValidOpaqueRow(row) {
  return Boolean(row && row.opaque_record);
}
