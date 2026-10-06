async function getWorkerKey(env) {
  const masterKey = env?.CHAT_MEDIA_MASTER_KEY;
  if (!masterKey) {
    throw new Error("CHAT_MEDIA_MASTER_KEY is not configured");
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(masterKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  return await crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWorkerBuffer(bytes, env) {
  const key = await getWorkerKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    bytes
  );
  const encryptedBytes = new Uint8Array(encryptedBuffer);
      
  const result = new Uint8Array(16 + encryptedBytes.length);
  result.set(iv, 0);
  result.set(encryptedBytes, 16);
  return result;
}

export async function decryptWorkerBuffer(bytes, env) {
  if (bytes.length < 16) {
    throw new Error("Invalid encrypted chat media payload");
  }

  try {
    const key = await getWorkerKey(env);
    const iv = bytes.slice(0, 16);
    const encryptedBytes = bytes.slice(16);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      encryptedBytes
    );
    return new Uint8Array(decryptedBuffer);
  } catch (err) {
    console.warn("[Worker Decrypt] Failed to decrypt chat media:", err);
    throw new Error("Failed to decrypt chat media");
  }
}
