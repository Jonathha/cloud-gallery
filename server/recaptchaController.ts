import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getModuleAndId, clearModuleBlock } from "./abuseProtectionMiddleware";

// Store in-memory for reCAPTCHA verified IPs with expiration timestamps
export const verifiedIps = new Map<string, number>();

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
  const { token, isLocalFallback, challenge, nonce, module: requestedModule } = req.body;
  
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
    if (!challenge || nonce === undefined) {
      return res.status(400).json({ success: false, error: 'Challenge e Nonce são obrigatórios para validação local.' });
    }
    try {
      // Verifica o Proof of Work matematicamente no servidor
      const hash = crypto.createHash("sha256").update(challenge + nonce).digest("hex");
      
      if (hash.startsWith("0000")) {
        // Limpa o bloqueio no middleware local
        clearModuleBlock(actualModule as any, targetId);
        return res.json({ success: true });
      } else {
        return res.status(400).json({ success: false, error: 'Assinatura local inválida ou burlada.' });
      }
    } catch (err: any) {
      console.error('Local verify error:', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao validar desafio local.' });
    }
  }

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  try {
    const secretKey = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAADwFk6ZJ0nsuBdSHj54wYkrcrtc';
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: getClientIp(req),
      }),
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
