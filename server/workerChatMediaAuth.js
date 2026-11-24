const FALLBACK_MEDIA_SIGNING_SECRET = "CHAT_MEDIA_SIGNING_KEY_PUSWPUPURIM_V1_2026_MASTER";

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function getSigningKey(env) {
  const secret = env?.CHAT_MEDIA_SIGNING_SECRET || env?.CHAT_GLOBAL_D1_API_TOKEN || FALLBACK_MEDIA_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("Chat media signing secret is not configured.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createChatMediaSignature(key, env, ttlSeconds = 300) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = key + "|" + exp;
  const signingKey = await getSigningKey(env);
  const signature = await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(payload));
  return { exp, sig: toBase64Url(new Uint8Array(signature)) };
}

export async function verifyChatMediaSignature(key, expValue, sigValue, env) {
  const exp = Number(expValue);
  if (!Number.isSafeInteger(exp) || exp <= Math.floor(Date.now() / 1000) || !sigValue) return false;
  let signature;
  try {
    signature = fromBase64Url(sigValue);
  } catch {
    return false;
  }
  const signingKey = await getSigningKey(env);
  return crypto.subtle.verify("HMAC", signingKey, signature, new TextEncoder().encode(key + "|" + exp));
}

export function getMediaKeyFromUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    const prefix = "/api/chat/media/";
    if (!url.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!key || key.includes("..") || (!key.startsWith("AUDIOS/") && !key.startsWith("audio/")) || !key.endsWith(".wav.enc")) return null;
    return key;
  } catch {
    return null;
  }
}
