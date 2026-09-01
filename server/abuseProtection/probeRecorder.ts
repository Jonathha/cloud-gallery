import { Request } from "express";
import { ModuleType } from "./types";
import { trackers, processedRequests } from "./trackers";
import { getClientIp, getModuleAndId } from "./helpers";

/**
 * Record a suspicious route enumeration or unauthorized probing attempt
 * (Only affects the specific module to prevent cross-module denial of service)
 */
export function recordProbeAttempt(req: Request, reason: string) {
  // Exempt normal deletion or storage 404 operations
  if (req.method === 'DELETE' && (req.path.startsWith('/api/storage/') || req.path.startsWith('/api/share/'))) {
    return;
  }
  if (req.method === 'GET' && req.path.startsWith('/api/storage/') && reason.includes('404')) {
    return;
  }

  const { module, id } = getModuleAndId(req);
  const tracker = trackers[module];
  const now = Date.now();
  let data = tracker.get(id);

  if (!data) {
    data = {
      id,
      windowStart: now,
      attempts: 1,
      blockedUntil: 0,
      captchaRequired: false,
      captchaSolvedAtAttempts: 0,
      recentAttempts: []
    };
    processedRequests.add(req);
    tracker.set(id, data);
  } else {
    const WINDOW_DURATION = 32 * 60 * 1000;
    if (now - data.windowStart >= WINDOW_DURATION) {
      data.windowStart = now;
      data.attempts = 1;
      processedRequests.add(req);
      data.captchaRequired = false;
      data.captchaSolvedAtAttempts = 0;
      data.blockedUntil = 0;
    } else {
      if (!processedRequests.has(req)) {
        data.attempts++;
        processedRequests.add(req);
      }
    }
  }

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const rota = req.originalUrl || req.path;
  const tentativas = data.attempts;
  const horario = new Date(now).toISOString();

  console.warn(`[SECURITY_AUDIT] [RATE_LIMIT_RECORD] [PROBE_DETECTED] IP="${ip}" UserAgent="${userAgent}" Rota="${rota}" Tentativas=${tentativas} Horario="${horario}" Reason="${reason}" Module="${module}"`);

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

  // Uniform security rules for all modules
  if (data.attempts >= 30) {
    if (data.blockedUntil < now) {
      const durationMs = (20 + Math.floor(Math.random() * 13)) * 60 * 1000; // between 20 and 32 minutes
      data.blockedUntil = now + durationMs;
      console.error(`[SECURITY_AUDIT] [TEMPORARY_BLOCK] Module="${module}" ID="${id}" blocked for ${Math.round(durationMs / 60000)}m due to excessive probe scanning.`);
    }
  } else if (data.attempts > 8) {
    const attemptsSinceSolve = data.attempts - data.captchaSolvedAtAttempts;
    const maxAllowed = (module === 'auth') ? 1 : 0;
    if (attemptsSinceSolve > maxAllowed) {
      data.captchaRequired = true;
    }
  }
}

export function clearModuleBlock(module: ModuleType, id: string) {
  const tracker = trackers[module];
  if (tracker) {
    const data = tracker.get(id);
    if (data) {
      data.captchaRequired = false;
      data.blockedUntil = 0;
      data.captchaSolvedAtAttempts = data.attempts;
      console.log(`[SECURITY_AUDIT] Cleared block and saved captchaSolvedAtAttempts=${data.captchaSolvedAtAttempts} for Module="${module}" ID="${id}".`);
    }
  }
}

export function clearModuleCaptcha(module: ModuleType, id: string) {
  clearModuleBlock(module, id);
}
