/**
 * Barrel centralizado do cliente Firestore REST para Cloudflare Workers
 * Exporta todas as constantes e operações REST com total compatibilidade
 * Mantém 100% de retrocompatibilidade com todas as chamadas do Worker
 */

export {
  EXPECTED_PROJECT_ID,
  PRIMARY_FIREBASE_API_KEY
} from "./firestoreREST/constants.js";

export {
  setFirestoreDocREST,
  deleteFirestoreDocREST
} from "./firestoreREST/setDoc.js";

export {
  getFirestoreDocREST
} from "./firestoreREST/getDoc.js";

export {
  createFirestoreDocIfNotExistREST
} from "./firestoreREST/docPreconditions.js";

export {
  updateFirestoreDocWithPreconditionREST
} from "./firestoreREST/updatePreconditions.js";

export {
  deleteFirestoreDocWithPreconditionREST
} from "./firestoreREST/deletePrecondition.js";

export {
  queryFirestoreREST
} from "./firestoreREST/queryDocs.js";
