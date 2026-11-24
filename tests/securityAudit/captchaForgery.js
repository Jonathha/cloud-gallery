import assert from "node:assert";
import crypto from "node:crypto";
import { generateCaptchaChallenge, verifyCaptchaChallenge, generateClearanceToken, verifyClearanceToken, handleVerifyRecaptcha } from "../../server/workerAuthRecaptcha.js";
import { RateLimiter } from "../../server/abuseProtection/limiterDo.js";
import { getShareForViewD1 } from "../../server/workerD1Shares.js";

const TEST_SECRET = "test-only-secret-for-security-audit-0123456789";

export async function runCaptchaForgeryTest(test) {
  // 1. Desafio local inventado pelo cliente
    await test("1. Desafio local inventado pelo cliente é rejeitado", async () => {
      // 1a: Tentativa com string arbitrária sem assinatura
      const arbitraryChallenge = "meu_desafio_inventado_pelo_cliente_123";
      const res1 = await verifyCaptchaChallenge(arbitraryChallenge, TEST_SECRET, "general", null, "1.2.3.4");
      assert.strictEqual(res1.valid, false, "Desafio sem formato deve ser inválido");
  
      // 1b: Tentativa com payload base64 forjado com assinatura falsa
      const fakePayload = btoa(JSON.stringify({ rand: "123", ts: Date.now(), exp: Date.now() + 60000, ip: "1.2.3.4" }));
      const fakeSig = "0000000000000000000000000000000000000000000000000000000000000000";
      const res2 = await verifyCaptchaChallenge(`${fakePayload}.${fakeSig}`, TEST_SECRET, "general", null, "1.2.3.4");
      assert.strictEqual(res2.valid, false, "Desafio forjado com assinatura inválida deve ser rejeitado");
  
      // 1c: Tentativa de envio direto para handleVerifyRecaptcha com isLocalFallback
      const req = new Request("https://example.com/api/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
        body: JSON.stringify({
          isLocalFallback: true,
          challenge: `${fakePayload}.${fakeSig}`,
          nonce: 100,
          module: "share_view",
          shareId: "share-xyz",
        }),
      });
      const resp = await handleVerifyRecaptcha(req, { TURNSTILE_SECRET_KEY: TEST_SECRET });
      const data = await resp.json();
      assert.strictEqual(resp.status, 400);
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("Turnstile") || data.error.includes("local"));
    });
}
