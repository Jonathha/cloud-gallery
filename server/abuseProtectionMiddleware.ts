/**
 * abuseProtectionMiddleware.ts - Camada de compatibilidade transparente
 * 
 * Re-exporta tipos, middlewares e manipuladores a partir
 * do submódulo modular ./abuseProtection/index.ts.
 */

export type { RequestAttempt, IpTrackingData, ModuleType } from "./abuseProtection/index";
export {
  trackers,
  processedRequests,
  getClientIp,
  getAuthIdentifier,
  getModuleAndId,
  recordProbeAttempt,
  clearModuleBlock,
  clearModuleCaptcha,
  abuseProtectionMiddleware
} from "./abuseProtection/index";
