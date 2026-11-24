export function validateChallengeTime(payload) {
  if (!payload.rand || !payload.exp || !payload.ts) {
    return { valid: false, error: "Estrutura do desafio incompleta." };
  }
  const now = Date.now();
  if (now > payload.exp) return { valid: false, error: "Desafio expirado." };
  if (payload.ts > now + 10000) return { valid: false, error: "Timestamp do desafio inválido." };
  return null;
}

/**
 * Validation is kept separate from signature verification.
 * Time checks run before HMAC verification, matching the original order.
 * Context checks run only after the signature has been accepted.
 * Each failure preserves the original error object and message.
 */
export function validateChallengeContext(payload, expectedModule, expectedShareId, ip) {
  if (expectedModule && payload.module && payload.module !== expectedModule) {
    return { valid: false, error: "Desafio emitido para outro módulo." };
  }
  if (expectedShareId) {
    if (!payload.shareId || payload.shareId !== expectedShareId) {
      return { valid: false, error: "Desafio emitido para outro compartilhamento." };
    }
  } else if (payload.shareId) {
    return { valid: false, error: "Desafio restrito a compartilhamento não coincide com o contexto." };
  }
  if (payload.ip && payload.ip !== '0.0.0.0' && ip && ip !== '0.0.0.0' && payload.ip !== ip) {
    return { valid: false, error: "Desafio emitido para outro endereço de IP." };
  }
  return null;
}
