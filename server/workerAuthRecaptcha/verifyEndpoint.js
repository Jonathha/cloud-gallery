import { jsonResponse } from "../workerHelpers.js";
import { resetWorkerCaptcha } from "../workerAbuseProtection.js";
import { generateClearanceToken } from "./clearanceTokens.js";
import { readVerificationBody, requestTurnstileVerification } from "./turnstileRequest.js";

async function clearWorkerCaptcha(request, env, moduleToClear, shareId = null, isSuspicious = false) {
  await resetWorkerCaptcha(request, env, moduleToClear, shareId, isSuspicious);
}

export async function handleVerifyRecaptcha(request, env) {
  try {
    const url = new URL(request.url);
    const method = request.method;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "0.0.0.0";
    const secretKey = env?.TURNSTILE_SECRET_KEY;
    if (typeof secretKey !== 'string' || secretKey.length < 32) {
      return jsonResponse({ success: false, error: 'Verificação de segurança indisponível: segredo do servidor não configurado.' }, 503);
    }

    const body = await readVerificationBody(request, method);

    const { token, isLocalFallback, module: requestedModule, shareId, action } = body;
    const queryAction = url.searchParams.get("action");
    const moduleToClear = requestedModule || url.searchParams.get("module") || 'general';
    const targetShareId = shareId || url.searchParams.get("shareId") || request.headers.get("X-Share-Id") || null;

    if (action === 'challenge' || queryAction === 'challenge' || method === 'GET') {
      return jsonResponse({ success: false, error: 'O fallback local foi desativado. Use o Turnstile.' }, 405);
    }

    const cf = request?.cf || {};
    const isTor = cf.isTor === true || cf.country === 'T1' || request.headers.get('CF-IPCountry') === 'T1' || request.headers.get('CF-Is-Tor') === 'true';
    const threatScore = typeof cf.threatScore === 'number' ? cf.threatScore : 0;
    const isSuspicious = isTor || threatScore >= 15;

    if (isLocalFallback) {
      return jsonResponse({
        success: false,
        error: 'A validação local por prova de trabalho não autoriza acesso. Conclua o Turnstile.'
      }, 400);
    }

    if (!token) {
      return jsonResponse({ success: false, error: "O token do Turnstile é obrigatório." }, 400);
    }

    const data = await requestTurnstileVerification(token, secretKey, ip, isSuspicious, isTor);

    if (data.success) {
      // Limpa o bloqueio do módulo no Durable Object
      await clearWorkerCaptcha(request, env, moduleToClear, targetShareId, isSuspicious);
      const clearanceToken = await generateClearanceToken(secretKey, targetShareId);
      const res = jsonResponse({ success: true, clearanceToken, shareId: targetShareId });
      res.headers.append("Set-Cookie", `cf_clearance_custom=${clearanceToken}; Path=/; SameSite=Lax; Max-Age=3600; Secure`);
      return res;
    } else {
      return jsonResponse({ success: false, error: "Falha na validação de segurança do Turnstile.", details: data }, 400);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: `Erro na verificação de segurança: ${err.message}` }, 500);
  }
}
