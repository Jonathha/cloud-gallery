import { decryptChatText } from "./chatCrypto.js";
import {
  getOrCreateVapidKeys,
  listPushSubscriptionsExceptUser,
  deletePushSubscriptionByEndpoint
} from "../../chat/d1PushSubscriptions.js";

const TEXT_ENCODER = new TextEncoder();

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

function concatBytes(...arrays) {
  const total = arrays.reduce((acc, a) => acc + a.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.byteLength;
  }
  return out;
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, dataBytes);
  return new Uint8Array(sig);
}

async function hkdfExtractAndExpand(salt, ikm, info, length) {
  const prk = await hmacSha256(salt, ikm);
  const input = concatBytes(info, new Uint8Array([1]));
  const okm = await hmacSha256(prk, input);
  return okm.slice(0, length);
}

/**
 * Encrypts Web Push payload following RFC 8291 (aes128gcm) using Web Crypto
 */
export async function encryptWebPushPayload(payloadString, subscriberP256dh, subscriberAuth) {
  const userPublicKeyBytes = fromBase64Url(subscriberP256dh);
  const authSecretBytes = fromBase64Url(subscriberAuth);
  if (userPublicKeyBytes.byteLength !== 65 || authSecretBytes.byteLength !== 16) {
    throw new Error("Invalid Web Push subscriber keys.");
  }

  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userPublicKey },
      serverKeys.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfo = concatBytes(
    TEXT_ENCODER.encode("WebPush: info\0"),
    userPublicKeyBytes,
    serverPublicKeyBytes
  );
  const ikm = await hkdfExtractAndExpand(authSecretBytes, sharedSecret, keyInfo, 32);

  const cekInfo = TEXT_ENCODER.encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdfExtractAndExpand(salt, ikm, cekInfo, 16);

  const nonceInfo = TEXT_ENCODER.encode("Content-Encoding: nonce\0");
  const nonce = await hkdfExtractAndExpand(salt, ikm, nonceInfo, 12);

  const payloadBytes = TEXT_ENCODER.encode(payloadString);
  const paddedPlaintext = concatBytes(payloadBytes, new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      aesKey,
      paddedPlaintext
    )
  );

  const header = new Uint8Array(16 + 4 + 1 + serverPublicKeyBytes.byteLength);
  header.set(salt, 0);
  const view = new DataView(header.buffer);
  view.setUint32(16, 4096, false);
  header[20] = serverPublicKeyBytes.byteLength;
  header.set(serverPublicKeyBytes, 21);

  return concatBytes(header, ciphertext);
}

async function createVapidJwt(endpoint, privateJwk) {
  const origin = new URL(endpoint).origin;
  const headerB64 = toBase64Url(TEXT_ENCODER.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payloadB64 = toBase64Url(
    TEXT_ENCODER.encode(JSON.stringify({ aud: origin, exp, sub: "mailto:admin@cloud-gallery.pages.dev" }))
  );
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      TEXT_ENCODER.encode(signingInput)
    )
  );

  return `${signingInput}.${toBase64Url(signature)}`;
}

function formatDurationShort(ms) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "";
  const total = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export async function buildChatNotificationPreview(message) {
  if (!message) return "Nova mensagem no Chat Global";
  if (message.mediaType === "audio") {
    const dur = formatDurationShort(message.audioDurationMs);
    return dur ? `Enviou um áudio (${dur})` : "Enviou uma mensagem de voz";
  }
  let raw = typeof message.text === "string" ? message.text.trim() : "";
  if (!raw && message.textCiphertext && message.textIv) {
    try {
      raw = (await decryptChatText(message.textCiphertext, message.textIv)).trim();
    } catch {
      raw = "";
    }
  }
  if (!raw) return "Nova mensagem no Chat Global";
  const chars = [...raw];
  return chars.length > 140 ? chars.slice(0, 137).join("") + "..." : raw;
}

export async function dispatchChatPushNotifications(message, env) {
  const subscriptions = await listPushSubscriptionsExceptUser(message.userId, env);
  if (!subscriptions.length) return { sent: 0, removed: 0 };

  const { publicKey, privateJwk } = await getOrCreateVapidKeys(env);
  const bodyText = await buildChatNotificationPreview(message);
  const payload = JSON.stringify({
    type: "chat_message",
    messageId: message.id,
    title: message.userName || "Chat Global",
    body: bodyText,
    tag: `chat-msg-${message.id}`,
    createdAt: message.createdAt || Date.now(),
    url: "/?tab=chat"
  });

  let sent = 0;
  let removed = 0;

  // Send in small batches to avoid hitting Worker subrequest limits
  const BATCH_SIZE = 20;
  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = subscriptions.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (sub) => {
        try {
          const encryptedBody = await encryptWebPushPayload(payload, sub.p256dh, sub.auth);
          const jwt = await createVapidJwt(sub.endpoint, privateJwk);
          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Authorization": `vapid t=${jwt}, k=${publicKey}`,
              "Content-Encoding": "aes128gcm",
              "Content-Type": "application/octet-stream",
              "TTL": "60",
              "Urgency": "high"
            },
            body: encryptedBody
          });
          if (res.status === 404 || res.status === 410) {
            removed++;
            await deletePushSubscriptionByEndpoint(sub.endpoint, env).catch(() => {});
          } else if (res.ok) {
            sent++;
          }
        } catch (err) {
          console.error("[chatWebPush] Push send error:", err?.message || err);
        }
      })
    );
  }

  return { sent, removed };
}
