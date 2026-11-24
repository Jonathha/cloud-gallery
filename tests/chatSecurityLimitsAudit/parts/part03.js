import assert from "node:assert";
import { saveChatMessage } from "../../../server/chatGlobalD1.js";

export async function part03(ctx) {
  const { test, userId, env2, user2 } = ctx;
  // Teste 4: Limite de áudio não impede envio de textos
  await test("4. Limite de 5 áudios não impede o envio de textos até alcançar o limite geral", async () => {
    // user2 tem 5 áudios. Ele ainda deve conseguir enviar 10 textos (total 15 mensagens < 20)
    for (let i = 1; i <= 10; i++) {
      const msg = await saveChatMessage({
        id: `extra_text_${i}`,
        userId: user2,
        mediaType: "text",
        textCiphertext: "cifrado",
        textIv: "iv",
        createdAt: Date.now()
      }, env2);
      assert.ok(msg.id);
    }

    // Total agora é 15 (5 áudios + 10 textos). Texto ainda passa!
    const msg16 = await saveChatMessage({
      id: "extra_text_16",
      userId: user2,
      mediaType: "text",
      textCiphertext: "cifrado",
      textIv: "iv",
      createdAt: Date.now()
    }, env2);
    assert.ok(msg16.id);
  });
}
