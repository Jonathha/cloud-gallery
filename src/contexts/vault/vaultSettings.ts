/**
 * Barrel centralizado de configurações e criptografia do cofre
 * Reexporta todas as funções preservando tipos e assinaturas
 * Garante compatibilidade transparente com todo o projeto
 */

export {
  toCipherString,
  updateLocalVaultCache,
  formatEncryptedImagePrefix
} from './settings/helpers';

export {
  updateExtraPasswordLogic
} from './settings/updateExtraPassword';

export {
  revertProtectedImageLogic
} from './settings/revertProtectedImage';

export {
  protectNewImageLogic
} from './settings/protectNewImage';

export {
  setSecurityImageLogic
} from './settings/setSecurityImage';

export {
  switchEncryptionModeLogic
} from './settings/switchEncryptionMode';
