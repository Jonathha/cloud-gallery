import assert from "node:assert";
import { saveChatMessage, reserveAudioUploadSlot, completeAudioUploadSlot } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part10(ctx) {
  const { test, userId } = ctx;
  // Teste 13: Respostas de erro retornam formato 429 consistente
  await test("13. Respostas de limite retornam tipo de erro e tempo de retry consistente", async () => {
    const env11 = createMockEnv();
    const user11 = "format_test_user";

    for (let i = 1; i <= 5; i++) {
      const res = await reserveAudioUploadSlot(user11, env11);
      await completeAudioUploadSlot(res.id, `AUDIOS/fmt_${i}.wav.enc`, env11);
    }

    try {
      await reserveAudioUploadSlot(user11, env11);
      assert.fail("Deveria ter lançado erro de limite");
    } catch (err) {
      assert.strictEqual(err.rateLimited, true);
      assert.strictEqual(err.limitType, "audio");
      assert.ok(typeof err.retryAfter === "number");
      assert.ok(err.retryAfter > 0);
      assert.ok(err.message.includes("Limite de áudios atingido"));
    }
  });

  // Teste 14: Mensagens existentes continuam sendo recuperadas normalmente
  await test("14. Histórico de mensagens existente continua preservado e ordenado", async () => {
    const env12 = createMockEnv();
    const t1 = Date.now() - 5000;
    const t2 = Date.now() - 2000;

    await saveChatMessage({ id: "msg_a", userId: "u1", mediaType: "text", textCiphertext: "a", textIv: "1", createdAt: t2 }, env12);
    await saveChatMessage({ id: "msg_b", userId: "u2", mediaType: "text", textCiphertext: "b", textIv: "2", createdAt: t1 }, env12);

    const chunks = await env12.__d1Tables.chat_global_json_chunks.get("Mensagem_0");
    const items = JSON.parse(chunks.data);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].id, "msg_b"); // ordenado por createdAt ASC
    assert.strictEqual(items[1].id, "msg_a");
  });
}
