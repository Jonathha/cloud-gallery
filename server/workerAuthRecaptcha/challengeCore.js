// Cache in-memory para rastrear desafios já consumidos e evitar reutilização (anti-replay)
export const consumedChallengeIds = new Map();
const CHALLENGE_VALIDITY_MS = 3 * 60 * 1000; // 3 minutos

export function cleanupConsumedChallenges() {
  const now = Date.now();
  for (const [id, exp] of consumedChallengeIds.entries()) {
    if (now > exp) {
      consumedChallengeIds.delete(id);
    }
  }
}

export async function generateCaptchaChallenge(secretKey, module = 'general', shareId = null, ip = '0.0.0.0') {
  if (typeof secretKey !== 'string' || secretKey.length < 32) throw new Error('TURNSTILE_SECRET_KEY ausente ou inválido.');
  cleanupConsumedChallenges();
  const randBytes = new Uint8Array(16);
  crypto.getRandomValues(randBytes);
  const randHex = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const now = Date.now();

  const payloadObj = {
    rand: randHex,
    ts: now,
    exp: now + CHALLENGE_VALIDITY_MS,
    ip: ip || '0.0.0.0',
    module: module || 'general',
    shareId: shareId || null
  };

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
