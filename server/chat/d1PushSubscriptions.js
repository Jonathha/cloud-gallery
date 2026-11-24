import { d1Query } from "./d1Config.js";
import { ensureChatGlobalSchema } from "./d1Schema.js";
import { readChunks, replaceDatasetUnlocked } from "./d1Chunks.js";
import { withDatasetLock } from "./d1Locks.js";

const VAPID_DATASET = "chat_vapid_v1";
let cachedVapidConfig = null;

function toBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function buildPublicKeyBytesFromJwk(jwk) {
  const x = fromBase64Url(jwk.x);
  const y = fromBase64Url(jwk.y);
  const uncompressed = new Uint8Array(65);
  uncompressed[0] = 0x04;
  uncompressed.set(x, 1);
  uncompressed.set(y, 33);
  return uncompressed;
}

export async function getOrCreateVapidKeys(env) {
  if (env?.VAPID_PUBLIC_KEY && env?.VAPID_PRIVATE_JWK) {
    try {
      const privateJwk = typeof env.VAPID_PRIVATE_JWK === "string"
        ? JSON.parse(env.VAPID_PRIVATE_JWK)
        : env.VAPID_PRIVATE_JWK;
      return { publicKey: env.VAPID_PUBLIC_KEY, privateJwk };
    } catch {}
  }

  if (cachedVapidConfig) return cachedVapidConfig;

  await ensureChatGlobalSchema(env);
  const existingChunks = await readChunks(VAPID_DATASET, env);
  const existing = existingChunks.flatMap(c => c.items).find(item => item && item.publicKey && item.privateJwk);
  if (existing) {
    cachedVapidConfig = { publicKey: existing.publicKey, privateJwk: existing.privateJwk };
    return cachedVapidConfig;
  }

  return withDatasetLock(VAPID_DATASET, env, async () => {
    const chunks = await readChunks(VAPID_DATASET, env);
    const found = chunks.flatMap(c => c.items).find(item => item && item.publicKey && item.privateJwk);
    if (found) {
      cachedVapidConfig = { publicKey: found.publicKey, privateJwk: found.privateJwk };
      return cachedVapidConfig;
    }

    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicKeyBytes = buildPublicKeyBytesFromJwk(privateJwk);
    const publicKey = toBase64Url(publicKeyBytes);

    const record = { id: "default", publicKey, privateJwk, createdAt: Date.now() };
    await replaceDatasetUnlocked(VAPID_DATASET, [record], env);
    cachedVapidConfig = { publicKey, privateJwk };
    return cachedVapidConfig;
  });
}

export async function upsertPushSubscription(userId, subscription, env) {
  await ensureChatGlobalSchema(env);
  const now = Date.now();
  const id = crypto.randomUUID();
  await d1Query(
    `INSERT INTO chat_global_push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       updated_at = excluded.updated_at`,
    [id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, now, now],
    env
  );
}

export async function removePushSubscription(userId, endpoint, env) {
  await ensureChatGlobalSchema(env);
  await d1Query(
    "DELETE FROM chat_global_push_subscriptions WHERE endpoint = ? AND user_id = ?",
    [endpoint, userId],
    env
  );
}

export async function deletePushSubscriptionByEndpoint(endpoint, env) {
  await ensureChatGlobalSchema(env);
  await d1Query(
    "DELETE FROM chat_global_push_subscriptions WHERE endpoint = ?",
    [endpoint],
    env
  );
}

export async function listPushSubscriptionsExceptUser(senderUserId, env) {
  await ensureChatGlobalSchema(env);
  const res = await d1Query(
    "SELECT id, user_id, endpoint, p256dh, auth FROM chat_global_push_subscriptions WHERE user_id != ? ORDER BY updated_at DESC LIMIT 100",
    [senderUserId],
    env
  );
  return res.results || [];
}
