/**
 * workerLogs.js - Camada de compatibilidade transparente
 * 
 * Re-exporta todas as funções públicas e manipuladores de logs
 * a partir do módulo modular ./workerLogs/index.js.
 */

export {
  handleRecordLog,
  handleFetchLogs,
  writeLogsDocREST,
  listLogsDocREST
} from "./workerLogs/index.js";
