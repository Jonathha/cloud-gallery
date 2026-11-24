import { consumedChallengeIds, cleanupConsumedChallenges } from "./challengeCore.js";
import { validateChallengeTime, validateChallengeContext } from "./challengeValidation.js";

export async function verifyCaptchaChallenge(challengeStr, secretKey, expectedModule = 'general', expectedShareId = null, ip = '0.0.0.0') {
  if (typeof secretKey !== 'string' || secretKey.length < 32) return { valid: false, error: 'Segredo de segurança não configurado.' };
  if (!challengeStr || typeof challengeStr !== 'string') {
    return { valid: false, error: "Desafio ausente ou inválido." };
  }
  const parts = challengeStr.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: "Formato de desafio inválido." };
  }

  const [b64Payload, sigHex] = parts;
  try {
    const payloadStr = atob(b64Payload);
    const payload = JSON.parse(payloadStr);

    const timeError = validateChallengeTime(payload);
    if (timeError) return timeError;

    // Valida assinatura criptográfica HMAC do servidor
    const keyBuffer = new TextEncoder().encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const match = sigHex.match(/.{1,2}/g);
    if (!match) return { valid: false, error: "Assinatura do desafio corrompida." };
    const sigBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    const verified = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, new TextEncoder().encode(payloadStr));

    if (!verified) {
      return { valid: false, error: "Desafio local inventado ou assinatura rejeitada pelo servidor." };
    }

    const contextError = validateChallengeContext(payload, expectedModule, expectedShareId, ip);
    if (contextError) return contextError;

    // Proteção contra repetição (anti-replay)
    cleanupConsumedChallenges();
    if (consumedChallengeIds.has(payload.rand)) {
      return { valid: false, error: "Desafio já utilizado anteriormente." };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: "Falha na análise do desafio." };
  }
}
