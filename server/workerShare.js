/**
 * workerShare.js - Camada de compatibilidade transparente
 * 
 * Re-exporta todos os manipuladores e funções de compartilhamento
 * do submódulo modular ./workerShare/index.js.
 */

export { 
  handleFindShare, 
  handleCreateShare, 
  handleViewShare, 
  handleDeleteShare,
  isShareActive
} from "./workerShare/index.js";
