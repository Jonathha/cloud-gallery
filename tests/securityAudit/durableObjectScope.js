import assert from "node:assert";
import crypto from "node:crypto";
import { generateCaptchaChallenge, verifyCaptchaChallenge, generateClearanceToken, verifyClearanceToken, handleVerifyRecaptcha } from "../../server/workerAuthRecaptcha.js";
import { RateLimiter } from "../../server/abuseProtection/limiterDo.js";
import { getShareForViewD1 } from "../../server/workerD1Shares.js";

const TEST_SECRET = "test-only-secret-for-security-audit-0123456789";

export async function runDurableObjectScopeTest(test) {
  // 4. Validação CAPTCHA de um link seguida de acesso a outro link (Durable Object)
    await test("4. Validação de um link no Durable Object NÃO autoriza outro link", async () => {
      // Mock do storage do Durable Object
      const memoryStorage = new Map();
      const mockStorage = {
        get: async (k) => memoryStorage.get(k) || null,
        put: async (k, v) => memoryStorage.set(k, v),
      };
      const mockState = { storage: mockStorage };
      const limiter = new RateLimiter(mockState, {});
  
      // Resolver captcha para o share A
      await limiter.fetch(new Request("https://do/limiter?action=verify_captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "share_view", id: "1.2.3.4", shareId: "share-AAA" }),
      }));
  
      // Checar acesso para o share A (deve estar verificado / liberar sem captcha)
      const resA = await limiter.fetch(new Request("https://do/limiter?action=check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "share_view",
          id: "1.2.3.4",
          path: "/api/share/view/share-AAA",
          shareId: "share-AAA",
          isTor: true, // Suspeito: exigiria captcha se não estivesse verificado
        }),
      }));
      const dataA = await resA.json();
      assert.strictEqual(dataA.captchaVerified, true, "Share A deve estar verificado");
      assert.strictEqual(dataA.captchaRequired, false, "Share A não deve exigir novo captcha");
  
      // Checar acesso para o share B (NÃO deve estar verificado! Deve exigir captcha!)
      const resB = await limiter.fetch(new Request("https://do/limiter?action=check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "share_view",
          id: "1.2.3.4",
          path: "/api/share/view/share-BBB",
          shareId: "share-BBB",
          isTor: true,
        }),
      }));
      const dataB = await resB.json();
      assert.strictEqual(dataB.captchaVerified, false, "Share B NÃO deve estar verificado!");
      assert.strictEqual(dataB.captchaRequired, true, "Share B DEVE exigir captcha para conexão suspeita!");
    });
}
