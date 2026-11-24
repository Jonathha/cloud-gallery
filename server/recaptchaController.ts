import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getModuleAndId, clearModuleBlock } from "./abuseProtectionMiddleware";

// Store in-memory for reCAPTCHA verified IPs with expiration timestamps
export const verifiedIps = new Map<string, number>();

const consumedChallengeIdsNode = new Map<string, number>();
const CHALLENGE_VALIDITY_MS = 3 * 60 * 1000;

function cleanupConsumedChallengesNode() {
  const now = Date.now();
  for (const [id, exp] of consumedChallengeIdsNode.entries()) {
    if (now > exp) {
      consumedChallengeIdsNode.delete(id);
    }
  }
}

export function generateCaptchaChallengeNode(secretKey: string, module = 'general', shareId: string | null = null, ip = '0.0.0.0'): string {
  if (typeof secretKey !== 'string' || secretKey.length < 32) throw new Error('TURNSTILE_SECRET_KEY ausente ou inválido.');
  cleanupConsumedChallengesNode();
  const randHex = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const payloadObj = {
    rand: randHex,
    ts: now,
    exp: now + CHALLENGE_VALIDITY_MS,
    ip: ip || '0.0.0.0',
    module: module || 'general',
    shareId: shareId || null
  };
  const payloadStr = JSON.stringify(payloadObj);
  const b64Payload = Buffer.from(payloadStr).toString('base64');
  const hmac = crypto.createHmac('sha256', secretKey).update(payloadStr).digest('hex');
  return `${b64Payload}.${hmac}`;
}

export function verifyCaptchaChallengeNode(challengeStr: string, secretKey: string, expectedModule = 'general', expectedShareId: string | null = null, ip = '0.0.0.0'): { valid: boolean; error?: string; payload?: any } {
  if (typeof secretKey !== 'string' || secretKey.length < 32) return { valid: false, error: 'Segredo de segurança não configurado.' };
  if (!challengeStr || typeof challengeStr !== 'string') {
    return { valid: false, error: 'Desafio ausente ou inválido.' };
  }
  const parts = challengeStr.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Formato de desafio inválido.' };
  }
  const [b64Payload, sigHex] = parts;
  try {
    const payloadStr = Buffer.from(b64Payload, 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (!payload.rand || !payload.exp || !payload.ts) {
      return { valid: false, error: 'Estrutura do desafio incompleta.' };
    }
    const now = Date.now();
    if (now > payload.exp) {
      return { valid: false, error: 'Desafio expirado.' };
    }
    if (payload.ts > now + 10000) {
      return { valid: false, error: 'Timestamp do desafio inválido.' };
    }

    const expectedHmac = crypto.createHmac('sha256', secretKey).update(payloadStr).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sigHex, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
      return { valid: false, error: 'Desafio local inventado ou assinatura rejeitada pelo servidor.' };
    }

    if (expectedModule && payload.module && payload.module !== expectedModule) {
      return { valid: false, error: 'Desafio emitido para outro módulo.' };
    }
    if (expectedShareId) {
      if (!payload.shareId || payload.shareId !== expectedShareId) {
        return { valid: false, error: 'Desafio emitido para outro compartilhamento.' };
      }
    } else if (payload.shareId) {
      return { valid: false, error: 'Desafio restrito a compartilhamento não coincide com o contexto.' };
    }
    if (payload.ip && payload.ip !== '0.0.0.0' && ip && ip !== '0.0.0.0' && payload.ip !== ip) {
      return { valid: false, error: 'Desafio emitido para outro endereço de IP.' };
    }

    cleanupConsumedChallengesNode();
    if (consumedChallengeIdsNode.has(payload.rand)) {
      return { valid: false, error: 'Desafio já utilizado anteriormente.' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Falha na análise do desafio.' };
  }
}

/**
 * Helper to retrieve client IP address safely in standard/container environment
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ipStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ipStr.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '0.0.0.0';
}

/**
 * API Handler to verify Google reCAPTCHA v2 token from client or local PoW fallback
 */
export async function verifyRecaptcha(req: Request, res: Response) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (typeof secretKey !== 'string' || secretKey.length < 32) {
    return res.status(503).json({ success: false, error: 'Verificação de segurança indisponível: segredo do servidor não configurado.' });
  }
  if (req.method === 'GET' || req.query.action === 'challenge' || req.body?.action === 'challenge') {
    return res.status(405).json({ success: false, error: 'O fallback local foi desativado. Use o Turnstile.' });
  }

  const { token, isLocalFallback, module: requestedModule } = req.body || {};
  
  const moduleToClear = requestedModule || 'general';

  // Create a mock request object with the target path and same headers to compute the right ID
  const mockReq = {
    path: `/api/${moduleToClear === 'general' ? '' : moduleToClear}/fake`,
    headers: req.headers,
    socket: req.socket,
    ip: req.ip
  } as Request;
  
  const { module: actualModule, id: targetId } = getModuleAndId(mockReq);

  if (isLocalFallback) {
    return res.status(400).json({ success: false, error: 'A validação local por prova de trabalho não autoriza acesso. Conclua o Turnstile.' });
  }

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  try {
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    
    const ip = getClientIp(req);
    const verifyPayload: Record<string, string> = {
      secret: secretKey,
      response: token,
    };
    if (ip && ip !== '0.0.0.0' && !req.headers['cf-ipcountry']?.includes('T1')) {
      verifyPayload.remoteip = ip;
    }

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    });
    
    const data = await response.json() as any;
    
    if (data.success) {
      // Limpa o bloqueio no middleware local
      clearModuleBlock(actualModule as any, targetId);
      return res.json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: 'Failed captcha verification', details: data });
    }
  } catch (error) {
    console.error('Recaptcha verification error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Express Middleware to ensure the client has successfully resolved the reCAPTCHA within the validity period
 */
export function requireRecaptcha(req: Request, res: Response, next: NextFunction) {
  // O gatilho automático rotativo de 30 minutos de reCAPTCHA foi completamente desativado a pedido do usuário.
  // A segurança das fotos é garantida de forma inviolável pela criptografia ponta-a-ponta PBKDF2 local do cliente.
  next();
}
