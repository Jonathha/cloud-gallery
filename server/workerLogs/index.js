export { 
  PRIMARY_FIREBASE_API_KEY, 
  isUserAdmin, 
  verifyFirebaseIdToken, 
  extractBearerToken 
} from "./auth.js";

export { 
  LOGS_PROJECT_ID, 
  base64url, 
  getGoogleAccessToken, 
  getValidAccessToken 
} from "./serviceAccount.js";

export { 
  toFirestoreValue, 
  fromFirestoreValue, 
  parseFirestoreDoc 
} from "./firestoreHelpers.js";

export { 
  writeLogsDocREST, 
  listLogsDocREST 
} from "./firestore.js";

export { 
  extractClientContext, 
  buildUserAccessDoc 
} from "./logRecordUserAccess.js";

export { 
  buildAuditDoc, 
  buildSecurityDoc 
} from "./logRecordAuditSecurity.js";

export { handleRecordLog } from "./logRecord.js";
export { handleFetchLogs } from "./logList.js";
