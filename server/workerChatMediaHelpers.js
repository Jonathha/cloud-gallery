const WORKER_MASTER_KEY = "PUSWPUPURIM##";

async function getWorkerKey() {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(WORKER_MASTER_KEY);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  return await crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWorkerBuffer(bytes) {
  const key = await getWorkerKey();
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

export async function decryptWorkerBuffer(bytes) {
  try {
    if (bytes.length < 16) return bytes;
    const key = await getWorkerKey();
    const iv = bytes.slice(0, 16);
    const encryptedBytes = bytes.slice(16);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      encryptedBytes
    );
    return new Uint8Array(decryptedBuffer);
  } catch (err) {
    console.warn("[Worker Decrypt] Fallback to raw bytes:", err);
    return bytes;
  }
}
