/**
 * Cloudflare D1 Vault Configuration, Media Keys, and Security Lockout
 * Entry point and re-exports for backward compatibility.
 */

export {
  ensureD1VaultSchema,
  calculateLockoutPenalty,
  recordVaultPenaltyD1,
  resetVaultPenaltyD1,
} from "./workerD1Vault/schema.js";

export {
  getUserVaultConfig,
  saveUserVaultSetup,
  saveOpaqueVaultSetupD1,
  updateVaultSettingsD1,
} from "./workerD1Vault/vaultConfig.js";

export {
  getMediaKeyD1,
  saveMediaKeyD1,
  deleteMediaKeyD1,
} from "./workerD1Vault/mediaKeys.js";
