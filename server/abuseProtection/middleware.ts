import { Request, Response, NextFunction } from "express";
import { trackers } from "./trackers";
import { getModuleAndId } from "./helpers";
import { recordProbeAttempt } from "./probeRecorder";
import { handleCaptchaRequired, handleAuthModuleAttempts } from "./middlewareHandlers";

const WINDOW_DURATION = 32 * 60 * 1000;

/**
 * Intelligent Abuse Protection & Rate Limiting Middleware
 * with complete isolation between application modules.
 */
export async function abuseProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/verify-recaptcha' || req.path.startsWith('/api/update/') || req.path === '/api/version') {
    return next();
  }

  const { module, id } = getModuleAndId(req);
  const tracker = trackers[module];
  const now = Date.now();
  const path = req.path;

  let data = tracker.get(id);
  if (!data) {
    data = {
      id,
      windowStart: now,
      attempts: 0,
      blockedUntil: 0,
      captchaRequired: false,
      captchaSolvedAtAttempts: 0,
      recentAttempts: []
    };
    tracker.set(id, data);
  }

  // Intercept responses to automatically record probe attempts on 401, 403, and 404
  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) {
      recordProbeAttempt(req, `Response status ${res.statusCode} for path ${req.path}`);
    }
    return originalSend.call(this, body);
  };

  // 1. Check if 32-minute window has expired
  if (now - data.windowStart >= WINDOW_DURATION) {
    data.windowStart = now;
    data.attempts = 0;
    data.captchaRequired = false;
    data.captchaSolvedAtAttempts = 0;
    data.blockedUntil = 0;
  }

  // 2. Check hard cooldown block (Level 2)
  if (data.blockedUntil > now) {
    console.warn(`[SECURITY_AUDIT] [BLOCKED_REQUEST] Module="${module}" ID="${id}" Path="${path}" Cooldown remaining.`);
    return res.status(429).json({
      success: false,
      error: "Acesso temporariamente suspenso devido a atividade incomum. Por favor, aguarde.",
      blocked: true
    });
  }

  // 3. Check if captcha is required (Level 1)
  if (handleCaptchaRequired(req, data, module, id, now, res)) {
    return;
  }

  // 4. For normal auth requests:
  if (handleAuthModuleAttempts(req, data, module, id, now, res)) {
    return;
  }

  next();
}
