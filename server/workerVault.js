/**
 * Barrel centralizado do módulo Worker Vault
 * Exporta todos os handlers mantendo 100% de compatibilidade com cloudflareWorker.js
 */

export {
  handleOpaqueRegisterInit,
  handleOpaqueRegisterFinish
} from "./workerVault/vaultOpaqueRegister.js";

export {
  handleOpaqueLoginInit
} from "./workerVault/vaultOpaqueLoginInit.js";

export {
  handleOpaqueLoginFinish
} from "./workerVault/vaultOpaqueLoginFinish.js";

export {
  handleGetVaultConfig,
  handleSaveVaultSetup
} from "./workerVault/vaultConfigHandlers.js";

export {
  handleRecordVaultPenalty,
  handleResetVaultPenalty
} from "./workerVault/vaultPenaltyHandlers.js";

export {
  handleUpdateVaultSettings
} from "./workerVault/vaultSettingsHandlers.js";

export {
  handleGetMediaKey,
  handleDeleteMediaKey
} from "./workerVault/vaultMediaKeyHandlers.js";

export {
  handleSaveMediaKey
} from "./workerVault/vaultSaveMediaKey.js";

export {
  handleGetAppConfig,
  handleSetAppConfig,
  handleRegisterDeviceToken
} from "./workerVault/vaultAppConfigHandlers.js";
