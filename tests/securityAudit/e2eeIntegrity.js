import assert from "node:assert";
import crypto from "node:crypto";
import { generateCaptchaChallenge, verifyCaptchaChallenge, generateClearanceToken, verifyClearanceToken, handleVerifyRecaptcha } from "../../server/workerAuthRecaptcha.js";
import { RateLimiter } from "../../server/abuseProtection/limiterDo.js";
import { getShareForViewD1 } from "../../server/workerD1Shares.js";

const TEST_SECRET = "test-only-secret-for-security-audit-0123456789";

export async function runE2eeIntegrityTest(test) {
  // 7. Fluxo E2EE continuando a funcionar (AES-GCM encrypt e decrypt)
    await test("7. Fluxo E2EE preservado com integridade total", async () => {
      const rawSecret = crypto.randomBytes(32).toString("base64");
      const rawKeyBuffer = Buffer.from(rawSecret, "base64");
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        rawKeyBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
  
      const iv = crypto.randomBytes(12);
      const plaintext = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      const plaintextBuffer = new TextEncoder().encode(plaintext);
  
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        plaintextBuffer
      );
      const ciphertextBase64 = Buffer.from(encrypted).toString("base64");
      const ivBase64 = Buffer.from(iv).toString("base64");
  
      // Descriptografia idêntica ao cliente
      const decryptKey = await crypto.subtle.importKey(
        "raw",
        rawKeyBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: Buffer.from(ivBase64, "base64") },
        decryptKey,
        Buffer.from(ciphertextBase64, "base64")
      );
      const decryptedText = new TextDecoder().decode(decryptedBuffer);
  
      assert.strictEqual(decryptedText, plaintext, "Texto descriptografado deve ser idêntico ao original");
    });
}
