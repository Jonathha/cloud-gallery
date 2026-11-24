export async function generateClearanceToken(secretKey, shareId = null) {
  if (typeof secretKey !== 'string' || secretKey.length < 32) throw new Error('TURNSTILE_SECRET_KEY ausente ou inválido.');
  const payloadObj = { ts: Date.now(), exp: Date.now() + 60 * 60 * 1000 };
  if (shareId) {
    payloadObj.shareId = shareId;
  }
  const payload = JSON.stringify(payloadObj);
  const keyBuffer = new TextEncoder().encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  const b64Payload = btoa(payload);
  return `${b64Payload}.${sigHex}`;
}

export async function verifyClearanceToken(tokenStr, secretKey, expectedShareId = null, isSuspicious = false) {
  if (typeof secretKey !== 'string' || secretKey.length < 32) return false;
  if (!tokenStr || typeof tokenStr !== 'string') return false;
  const parts = tokenStr.split('.');
  if (parts.length !== 2) return false;
  const [b64Payload, sigHex] = parts;
  try {
    const payloadStr = atob(b64Payload);
    const payload = JSON.parse(payloadStr);
    if (!payload.exp || Date.now() > payload.exp) return false;

    // Vínculo estrito ao shareId:
    // Se a rota acessada exige um shareId específico, o token PRECISA ser para esse shareId específico
    if (expectedShareId) {
      if (!payload.shareId || payload.shareId !== expectedShareId) {
        return false;
      }
    }

    // Se o token foi emitido para um shareId específico, ele nunca deve ser aceito para outro shareId ou rota sem shareId
    if (payload.shareId && (!expectedShareId || payload.shareId !== expectedShareId)) {
      return false;
    }
    
    const keyBuffer = new TextEncoder().encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const match = sigHex.match(/.{1,2}/g);
    if (!match) return false;
    const sigBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    return await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, new TextEncoder().encode(payloadStr));
  } catch {
    return false;
  }
}
