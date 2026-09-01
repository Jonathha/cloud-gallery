import { Request, Response } from "express";
import { IpTrackingData, ModuleType } from "./types";
import { processedRequests } from "./trackers";
import { getClientIp } from "./helpers";

function logAttempt(req: Request, data: IpTrackingData, now: number) {
  if (!processedRequests.has(req)) {
    data.attempts++;
    processedRequests.add(req);
  }
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const rota = req.originalUrl || req.path;
  const tentativas = data.attempts;
  const horario = new Date(now).toISOString();

  if (!data.recentAttempts) {
    data.recentAttempts = [];
  }
  data.recentAttempts.push({
    ip,
    userAgent,
    path: rota,
    attempts: tentativas,
    timestamp: horario
  });
  if (data.recentAttempts.length > 10) {
    data.recentAttempts.shift();
  }
}

export function handleCaptchaRequired(
  req: Request,
  data: IpTrackingData,
  module: ModuleType,
  id: string,
  now: number,
  res: Response
): boolean {
  if (!data.captchaRequired) return false;
  logAttempt(req, data, now);

  if (data.attempts >= 30) {
    const durationMs = (20 + Math.floor(Math.random() * 13)) * 60 * 1000;
    data.blockedUntil = now + durationMs;
    console.error(`[SECURITY_AUDIT] [TEMPORARY_BLOCK] Module="${module}" ID="${id}" blocked for ${Math.round(durationMs / 60000)}m. Attempts=${data.attempts}`);
    res.status(429).json({
      success: false,
      error: "Acesso temporariamente suspenso devido a atividade incomum.",
      blocked: true
    });
    return true;
  }

  console.warn(`[SECURITY_AUDIT] [CAPTCHA_REQUIRED] Module="${module}" ID="${id}" Path="${req.path}" Attempts=${data.attempts}`);
  res.setHeader("X-Security-Captcha-Required", "true");
  res.status(429).json({
    success: false,
    error: "Verificação de segurança necessária.",
    captchaRequired: true,
    module
  });
  return true;
}

export function handleAuthModuleAttempts(
  req: Request,
  data: IpTrackingData,
  module: ModuleType,
  id: string,
  now: number,
  res: Response
): boolean {
  if (module !== 'auth') return false;
  logAttempt(req, data, now);

  if (data.attempts >= 30) {
    const durationMs = (20 + Math.floor(Math.random() * 13)) * 60 * 1000;
    data.blockedUntil = now + durationMs;
    console.error(`[SECURITY_AUDIT] [TEMPORARY_BLOCK] Module="${module}" ID="${id}" blocked for ${Math.round(durationMs / 60000)}m. Attempts=${data.attempts}`);
    res.status(429).json({
      success: false,
      error: "Acesso temporariamente suspenso devido a atividade incomum.",
      blocked: true
    });
    return true;
  }

  if (data.attempts > 8) {
    const attemptsSinceSolve = data.attempts - data.captchaSolvedAtAttempts;
    const maxAllowed = 1;
    if (attemptsSinceSolve > maxAllowed) {
      data.captchaRequired = true;
      console.warn(`[SECURITY_AUDIT] [CAPTCHA_REQUIRED] Module="${module}" ID="${id}" Path="${req.path}" Attempts=${data.attempts}`);
      res.setHeader("X-Security-Captcha-Required", "true");
      res.status(429).json({
        success: false,
        error: "Verificação de segurança necessária.",
        captchaRequired: true,
        module
      });
      return true;
    }
  }

  return false;
}
