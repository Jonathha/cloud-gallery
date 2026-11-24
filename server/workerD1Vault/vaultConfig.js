import { ensureD1VaultSchema } from "./schema.js";
import { getUserMetadataList } from "../workerD1Storage/operations.js";

/**
 * Gets user vault configuration from D1.
 * If not in D1 yet, checks if user has existing media metadata to prevent showing setup screen.
 */
export async function getUserVaultConfig(db, userId, idToken) {
  if (!db || !userId) return null;
  await ensureD1VaultSchema(db);

  // 1. Check D1 first (D1 is official canonical store)
  const stmt = db.prepare("SELECT * FROM user_vault_store WHERE user_id = ?");
  const row = await stmt.bind(userId).first();
  if (row) {
    const isOpaque = (row.vault_version === 2) || !!row.opaque_record;

    let parsedEncryptedVaultKey = null;
    if (row.encrypted_vault_key) {
      try {
        parsedEncryptedVaultKey = typeof row.encrypted_vault_key === 'string'
          ? JSON.parse(row.encrypted_vault_key)
          : row.encrypted_vault_key;
      } catch (e) {
        parsedEncryptedVaultKey = row.encrypted_vault_key;
      }
    }

    let parsedExtraPassword = null;
    if (row.extra_password) {
      try {
        parsedExtraPassword = typeof row.extra_password === 'string'
          ? JSON.parse(row.extra_password)
          : row.extra_password;
      } catch (e) {
        parsedExtraPassword = row.extra_password;
      }
    }

    let parsedVerification = null;
    if (row.verification) {
      try {
        parsedVerification = typeof row.verification === 'string'
          ? JSON.parse(row.verification)
          : row.verification;
      } catch (e) {
        parsedVerification = row.verification;
      }
    }

    return {
      userId: row.user_id,
      vaultVersion: isOpaque ? 2 : (row.vault_version || 1),
      salt: row.salt || null,
      verification: parsedVerification || row.verification || null,
      opaqueRecord: isOpaque ? (row.opaque_record || null) : null,
      encryptedVaultKey: parsedEncryptedVaultKey,
      keyWrappingVersion: row.key_wrapping_version || 1,
      encryptionMode: row.encryption_mode || "standard",
      extraPassword: parsedExtraPassword,
      extraPasswordUpdatedAt: row.extra_password_updated_at || 0,
      failedAttempts: row.failed_attempts || 0,
      lockedUntil: row.locked_until || null,
      fakeVaultSalt: row.fake_vault_salt || null,
      fakeVaultVerification: row.fake_vault_verification || null,
      securityImageId: row.security_image_id || null,
      securityImageIdUpdatedAt: row.security_image_id_updated_at || 0,
      extraPasswordSalt: row.extra_password_salt || null,
      extraPasswordVerification: row.extra_password_verification || null,
      encryptedShareRecovery: row.encrypted_share_recovery || null,
      usedStorage: row.used_storage || 0,
      theme: row.theme || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // 2. Fallback check: if user has media items in D1, they already had a vault!
  try {
    const userItems = await getUserMetadataList(db, userId);
    if (userItems && userItems.length > 0) {
      return {
        userId,
        hasMedia: true,
        needsPasswordRestore: true,
        vaultVersion: 1,
        salt: null,
        verification: null,
        opaqueRecord: null,
        encryptedVaultKey: null
      };
    }
  } catch (e) {}

  return null;
}

/**
 * Saves initial vault setup into D1 (Web Crypto format).
 */
export async function saveUserVaultSetup(db, userId, data) {
  if (!db || !userId) return false;
  await ensureD1VaultSchema(db);
  const now = Date.now();

  const encKeyStr = data.encryptedVaultKey
    ? (typeof data.encryptedVaultKey === 'object' ? JSON.stringify(data.encryptedVaultKey) : String(data.encryptedVaultKey))
    : null;

  const extraPwdStr = data.extraPassword
    ? (typeof data.extraPassword === 'object' ? JSON.stringify(data.extraPassword) : String(data.extraPassword))
    : null;

  const insertStmt = db.prepare(`
    INSERT INTO user_vault_store (
      user_id, salt, verification, vault_version, encrypted_vault_key,
      key_wrapping_version, encryption_mode, extra_password, extra_password_updated_at,
      security_image_id, security_image_id_updated_at, failed_attempts, locked_until,
      created_at, updated_at
    ) VALUES (?, ?, '', 2, ?, 1, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
  `);

  await insertStmt.bind(
    userId,
    data.salt || '',
    encKeyStr,
    data.encryptionMode || 'standard',
    extraPwdStr,
    data.extraPasswordUpdatedAt || 0,
    data.securityImageId || null,
    data.securityImageIdUpdatedAt || 0,
    now,
    now
  ).run();

  return true;
}

/**
 * Saves OPAQUE vault setup into D1 and purges legacy verification fields.
 */
export async function saveOpaqueVaultSetupD1(db, userId, data) {
  if (!db || !userId || !data.registrationRecord || !data.encryptedVaultKey) return false;
  await ensureD1VaultSchema(db);

  const existing = await db.prepare("SELECT user_id FROM user_vault_store WHERE user_id = ?").bind(userId).first();
  if (existing) return false;

  const now = Date.now();

  const encKeyStr = typeof data.encryptedVaultKey === 'object'
    ? JSON.stringify(data.encryptedVaultKey)
    : String(data.encryptedVaultKey);

  const extraPwdStr = data.extraPassword
    ? (typeof data.extraPassword === 'object' ? JSON.stringify(data.extraPassword) : String(data.extraPassword))
    : null;

  const insertStmt = db.prepare(`
    INSERT INTO user_vault_store (
      user_id, salt, verification, vault_version, opaque_record, encrypted_vault_key,
      key_wrapping_version, encryption_mode, extra_password, extra_password_updated_at,
      security_image_id, security_image_id_updated_at, failed_attempts, locked_until,
      created_at, updated_at
    ) VALUES (?, ?, '', 2, ?, ?, 1, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
  `);

  await insertStmt.bind(
    userId,
    data.salt || '',
    data.registrationRecord,
    encKeyStr,
    data.encryptionMode || "standard",
    extraPwdStr,
    data.extraPasswordUpdatedAt || 0,
    data.securityImageId || null,
    data.securityImageIdUpdatedAt || 0,
    now,
    now
  ).run();

  return true;
}

/**
 * Updates settings fields (securityImageId, extraPassword, fakeVault, etc.) in D1.
 */
export async function updateVaultSettingsD1(db, userId, settings) {
  if (!db || !userId) return false;
  await ensureD1VaultSchema(db);
  const now = Date.now();

  const current = await db.prepare("SELECT * FROM user_vault_store WHERE user_id = ?").bind(userId).first();
  if (!current) {
    return false;
  }

  const updated = {
    fake_vault_salt: settings.fakeVaultSalt !== undefined ? settings.fakeVaultSalt : current.fake_vault_salt,
    fake_vault_verification: settings.fakeVaultVerification !== undefined ? settings.fakeVaultVerification : current.fake_vault_verification,
    security_image_id: settings.securityImageId !== undefined ? settings.securityImageId : current.security_image_id,
    extra_password_salt: settings.extraPasswordSalt !== undefined ? settings.extraPasswordSalt : current.extra_password_salt,
    extra_password_verification: settings.extraPasswordVerification !== undefined ? settings.extraPasswordVerification : current.extra_password_verification,
    encrypted_share_recovery: settings.encryptedShareRecovery !== undefined ? settings.encryptedShareRecovery : current.encrypted_share_recovery,
    theme: settings.theme !== undefined ? settings.theme : current.theme,
    used_storage: settings.usedStorage !== undefined ? settings.usedStorage : current.used_storage,
  };

  await db.prepare(`
    UPDATE user_vault_store SET
      fake_vault_salt = ?,
      fake_vault_verification = ?,
      security_image_id = ?,
      extra_password_salt = ?,
      extra_password_verification = ?,
      encrypted_share_recovery = ?,
      theme = ?,
      used_storage = ?,
      updated_at = ?
    WHERE user_id = ?
  `).bind(
    updated.fake_vault_salt,
    updated.fake_vault_verification,
    updated.security_image_id,
    updated.extra_password_salt,
    updated.extra_password_verification,
    updated.encrypted_share_recovery,
    updated.theme,
    updated.used_storage,
    now,
    userId
  ).run();

  return true;
}
