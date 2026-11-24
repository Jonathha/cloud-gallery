import assert from "node:assert";
import crypto from "node:crypto";
import { generateCaptchaChallenge, verifyCaptchaChallenge, generateClearanceToken, verifyClearanceToken, handleVerifyRecaptcha } from "../../server/workerAuthRecaptcha.js";
import { RateLimiter } from "../../server/abuseProtection/limiterDo.js";
import { getShareForViewD1 } from "../../server/workerD1Shares.js";

const TEST_SECRET = "test-only-secret-for-security-audit-0123456789";

export async function runExpiredChallengeTest(test) {
  // 2. Desafio expirado e fallback local desativado
    await test("2. Desafio expirado é rejeitado e PoW local não concede clearance", async () => {
      const expiredPayload = {
        rand: "expired_token_id_999",
        ts: Date.now() - 10 * 60 * 1000,
        exp: Date.now() - 5 * 60 * 1000,
        ip: "1.2.3.4",
        module: "general",
        shareId: null,
      };
      const pStr = JSON.stringify(expiredPayload);
      const keyBuf = new TextEncoder().encode(TEST_SECRET);
      const cKey = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", cKey, new TextEncoder().encode(pStr));
      const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
      const expiredChallenge = `${btoa(pStr)}.${sigHex}`;
      const resExpired = await verifyCaptchaChallenge(expiredChallenge, TEST_SECRET, "general", null, "1.2.3.4");
      assert.strictEqual(resExpired.valid, false);
      assert.strictEqual(resExpired.error, "Desafio expirado.");
  
      const validChallenge = await generateCaptchaChallenge(TEST_SECRET, "share_view", "share-123", "1.2.3.4");
      const req = new Request("https://example.com/api/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
        body: JSON.stringify({ isLocalFallback: true, challenge: validChallenge, nonce: 0, module: "share_view", shareId: "share-123" }),
      });
      const resp = await handleVerifyRecaptcha(req, { TURNSTILE_SECRET_KEY: TEST_SECRET });
      const data = await resp.json();
      assert.strictEqual(resp.status, 400);
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("Turnstile"));
    });
}
