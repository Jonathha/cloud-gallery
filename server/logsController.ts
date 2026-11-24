/**
 * Controller centralizado de logs para o servidor Node.js/Express
 * Exporta manipuladores de busca e gravação com compatibilidade 100%
 */

export {
  LOGS_PROJECT_ID,
  LOGS_API_KEY,
  PRIMARY_FIREBASE_API_KEY,
  DEFAULT_ADMIN_EMAILS,
  isUserAdmin,
  getClientIpFromRequest
} from './logs/constants';

export {
  verifyFirebaseIdToken,
  extractBearerToken
} from './logs/auth';

export {
  toFirestoreValue,
  fromFirestoreValue,
  parseFirestoreDoc
} from './logs/firestoreHelpers';

export {
  writeLogsDocREST,
  listLogsDocREST
} from './logs/restClient';

export {
  handleRecordLogExpress
} from './logs/recordLogHandler';
