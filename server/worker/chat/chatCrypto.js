const SHARED_PASS = "CHAT_GLOBAL_SECRET_KEY_123";
const SHARED_SALT = "Y2hhdF9nbG9iYWxfc2FsdF8xMjM=";
let cachedChatKey = null;

async function getChatCryptoKey() {
  if (cachedChatKey) return cachedChatKey;
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(SHARED_SALT), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(SHARED_PASS),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  cachedChatKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  return cachedChatKey;
}

export async function decryptChatText(ciphertextBase64, ivBase64) {
  const key = await getChatCryptoKey();
  const ciphertextStr = atob(ciphertextBase64);
  const ciphertextBytes = new Uint8Array(ciphertextStr.length);
  for (let i = 0; i < ciphertextStr.length; i++) ciphertextBytes[i] = ciphertextStr.charCodeAt(i);

  const ivStr = atob(ivBase64);
  const ivBytes = new Uint8Array(ivStr.length);
  for (let i = 0; i < ivStr.length; i++) ivBytes[i] = ivStr.charCodeAt(i);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    ciphertextBytes
  );
  return new TextDecoder().decode(decrypted);
}
