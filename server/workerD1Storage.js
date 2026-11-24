/**
 * Cloudflare D1 User-Partitioned Metadata Storage
 * Entry point and re-exports for backward compatibility.
 */

export {
  SAFE_CHUNK_SIZE,
  ensureD1UserSchema,
  acquireD1RecoveryLock,
  releaseD1RecoveryLock,
} from "./workerD1Storage/schema.js";

export {
  getUserMetadataList,
  findUserMediaItem,
  saveUserMediaItem,
  deleteUserMediaItem,
  deleteUserMediaItems,
} from "./workerD1Storage/operations.js";

export {
  repairStaleD1UserMetadataFromR2,
  migrateUserFromFirestoreIfEmpty,
} from "./workerD1Storage/maintenance.js";
