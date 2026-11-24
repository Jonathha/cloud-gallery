import assert from "node:assert";
import crypto from "node:crypto";
import { generateCaptchaChallenge, verifyCaptchaChallenge, generateClearanceToken, verifyClearanceToken, handleVerifyRecaptcha } from "../../server/workerAuthRecaptcha.js";

const TEST_SECRET = "test-only-secret-for-security-audit-0123456789";

export async function runClearanceScopeTest(test) {
  await test("3. Token válido para o compartilhamento A usado no compartilhamento B é rejeitado", async () => {
          const tokenA = await generateClearanceToken(TEST_SECRET, "share-AAA");
      
          // Teste 3a: Validação no compartilhamento A (correto)
          const validOnA = await verifyClearanceToken(tokenA, TEST_SECRET, "share-AAA");
          assert.strictEqual(validOnA, true, "Token de A deve ser válido em A");
      
          // Teste 3b: Validação no compartilhamento B (rejeitado)
          const validOnB = await verifyClearanceToken(tokenA, TEST_SECRET, "share-BBB");
          assert.strictEqual(validOnB, false, "Token de A NÃO pode ser válido em B");
      
          // Teste 3c: Token genérico (sem shareId) usado em rota que exige shareId
          const tokenGeneral = await generateClearanceToken(TEST_SECRET, null);
          const generalOnShare = await verifyClearanceToken(tokenGeneral, TEST_SECRET, "share-AAA");
          assert.strictEqual(generalOnShare, false, "Token geral sem shareId NÃO pode ser válido para share-AAA");
        });
}

export async function runClearanceSignatureTest(test) {
  await test("5. Token expirado, assinatura inválida e inconsistência de segredo são rejeitados", async () => {
          // 5a: Token expirado
          const expiredPayload = btoa(JSON.stringify({ ts: Date.now() - 7200000, exp: Date.now() - 3600000, shareId: "share-123" }));
          const dummySig = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
          const resExp = await verifyClearanceToken(`${expiredPayload}.${dummySig}`, TEST_SECRET, "share-123");
          assert.strictEqual(resExp, false, "Token com exp no passado deve ser rejeitado");
      
          // 5b: Assinatura inválida (tampered payload)
          const validToken = await generateClearanceToken(TEST_SECRET, "share-123");
          const [payloadPart, sigPart] = validToken.split(".");
          const tamperedPayload = btoa(JSON.stringify({ ts: Date.now(), exp: Date.now() + 3600000, shareId: "share-hacked" }));
          const resTampered = await verifyClearanceToken(`${tamperedPayload}.${sigPart}`, TEST_SECRET, "share-hacked");
          assert.strictEqual(resTampered, false, "Payload adulterado com assinatura antiga deve ser rejeitado");
      
          // 5c: Segredo inconsistente (assinado com secret-X, verificado com secret-Y)
          const tokenSecretX = await generateClearanceToken("secret-chave-X-0123456789-0123456789", "share-123");
          const resSecretY = await verifyClearanceToken(tokenSecretX, "secret-chave-Y-0123456789-0123456789", "share-123");
          assert.strictEqual(resSecretY, false, "Token com segredo inconsistente deve ser rejeitado");
        });
}

export async function runMissingSecretTest(test) {
  await test("6. Endpoint CAPTCHA rejeita segredo de servidor ausente", async () => {
          const req = new Request("https://example.com/api/verify-recaptcha", {
            method: "POST",
            headers: { "Content-Type": "application/json", "CF-Connecting-IP": "189.10.20.30" },
            body: JSON.stringify({ token: "fake-turnstile-token", module: "share_view", shareId: "share-legit-777" }),
          });
          const resp = await handleVerifyRecaptcha(req, {});
          const data = await resp.json();
          assert.strictEqual(resp.status, 503);
          assert.strictEqual(data.success, false);
        });
}
