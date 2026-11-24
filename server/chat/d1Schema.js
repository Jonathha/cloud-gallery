import { d1Query } from "./d1Config.js";

let schemaInitialized = false;

export async function ensureChatGlobalSchema(env) {
  if (schemaInitialized) return;
  await d1Query(`
    CREATE TABLE IF NOT EXISTS chat_global_json_chunks (
      dataset TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      data TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (dataset, chunk_index)
    )
  `, [], env);
  await d1Query(`
    CREATE TABLE IF NOT EXISTS chat_global_locks (
      dataset TEXT PRIMARY KEY,
      lock_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `, [], env);
  await d1Query(`
    CREATE TABLE IF NOT EXISTS chat_global_audio_uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      linked_message_id TEXT
    )
  `, [], env);
  await d1Query(`
    CREATE TABLE IF NOT EXISTS chat_global_media_cleanup (
      id TEXT PRIMARY KEY,
      media_key TEXT NOT NULL,
      reason TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      last_error TEXT,
      created_at INTEGER NOT NULL,
      last_attempt_at INTEGER NOT NULL
    )
  `, [], env);
  await d1Query(`
    CREATE TABLE IF NOT EXISTS chat_global_push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `, [], env);
  schemaInitialized = true;
}
