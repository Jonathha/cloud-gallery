import assert from "node:assert";
import { saveChatMessage } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part01(ctx) {
  const { test } = ctx;
  const env = (ctx.env = createMockEnv());

  const userId = (ctx.userId = "user_test_limits_123");

  // Teste 1: Envio de textos respeita o limite de 20 mensagens em 3 min
  await test("1. O envio de textos respeita o limite de 20 mensagens em 3 minutos", async () => {
    for (let i = 1; i <= 20; i++) {
      await saveChatMessage({
        id: `text_msg_${i}`,
        userId,
        mediaType: "text",
        textCiphertext: "cifrado",
        textIv: "iv",
        createdAt: Date.now()
      }, env);
    }

    let rateLimited = false;
    try {
      await saveChatMessage({
        id: "text_msg_21",
        userId,
        mediaType: "text",
        textCiphertext: "cifrado",
        textIv: "iv",
        createdAt: Date.now()
      }, env);
    } catch (err) {
      rateLimited = err.rateLimited === true && err.limitType === "messages";
      assert.strictEqual(rateLimited, true);
      assert.ok(err.retryAfter > 0);
    }
    assert.strictEqual(rateLimited, true, "A 21ª mensagem de texto deve ser rejeitada com 429");
  });

  // Limpa para os próximos testes
  const env2 = (ctx.env2 = createMockEnv());

  const user2 = (ctx.user2 = "user_audio_test_2");
}
