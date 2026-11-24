import { generateCaptchaChallenge as generateChallenge } from "./workerAuthRecaptcha/challengeCore.js";
import { verifyCaptchaChallenge as verifyChallenge } from "./workerAuthRecaptcha/challengeVerify.js";
import { generateClearanceToken as generateToken, verifyClearanceToken as verifyToken } from "./workerAuthRecaptcha/clearanceTokens.js";
import { handleVerifyRecaptcha as verifyEndpoint } from "./workerAuthRecaptcha/verifyEndpoint.js";

/**
 * Wrapper behavior remains asynchronous, like the original exported functions.
 * Compatibility layer for existing CAPTCHA and Turnstile imports.
 * These wrappers preserve the public names and argument order.
 * Challenge, clearance-token, and endpoint logic stay in focused modules.
 * Keep this path stable for current Worker routes and tests.
 */
/** Keeps existing imports stable while the implementation stays modular. */
export async function generateCaptchaChallenge(secretKey, module = "general", shareId = null, ip = "0.0.0.0") {
  return generateChallenge(secretKey, module, shareId, ip);
}

export async function verifyCaptchaChallenge(challengeStr, secretKey, expectedModule = "general", expectedShareId = null, ip = "0.0.0.0") {
  return verifyChallenge(challengeStr, secretKey, expectedModule, expectedShareId, ip);
}

export async function generateClearanceToken(secretKey, shareId = null) {
  return generateToken(secretKey, shareId);
}

export async function verifyClearanceToken(tokenStr, secretKey, expectedShareId = null, isSuspicious = false) {
  return verifyToken(tokenStr, secretKey, expectedShareId, isSuspicious);
}

export async function handleVerifyRecaptcha(request, env) {
  return verifyEndpoint(request, env);
}
