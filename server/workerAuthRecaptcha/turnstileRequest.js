export async function readVerificationBody(request, method) {
  if (method !== "POST") return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/**
 * This module performs only the existing outbound verification request.
 * The parsed JSON body is returned without changing its shape.
 * No token, secret, or IP normalization is added in this helper.
 * HTTP errors continue to be interpreted by the endpoint handler.
 * Request parsing is isolated so malformed JSON keeps its prior fallback.
 * The verification request uses the same endpoint and POST payload.
 * Remote IP is included only under the original safety conditions.
 * The caller still decides how to handle a successful or failed response.
 */
export async function requestTurnstileVerification(token, secretKey, ip, isSuspicious, isTor) {
  const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const verifyPayload = { secret: secretKey, response: token };
  if (!isSuspicious && !isTor && ip && ip !== "0.0.0.0" && !ip.includes(':')) {
    verifyPayload.remoteip = ip;
  }
  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(verifyPayload)
  });
  return response.json();
}
