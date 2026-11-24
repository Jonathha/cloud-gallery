import assert from "node:assert";
import { saveChatMessage } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part06(ctx) {
  const { test, userId } = ctx;
  // Teste 7: Troca de IDs ou reenvio não contorna a regra
  await test("7. Manipulação de IDs na requisição não contorna o limite atômico", async () => {
    const env5 = createMockEnv();
    const user5 = "user_id_tamper";

    // Envia 20 mensagens usando IDs aleatórios
    for (let i = 1; i <= 20; i++) {
      await saveChatMessage({
        id: `random_id_${Math.random()}_${i}`,
        userId: user5,
        mediaType: "text",
        textCiphertext: "cifrado",
        textIv: "iv",
        createdAt: Date.now()
      }, env5);
    }

    let blocked = false;
    try {
      await saveChatMessage({
        id: `attacker_new_id_${Date.now()}`,
        userId: user5,
        mediaType: "text",
        textCiphertext: "cifrado",
        textIv: "iv",
        createdAt: Date.now()
      }, env5);
    } catch (err) {
      blocked = err.rateLimited === true;
    }
    assert.strictEqual(blocked, true, "O controle deve rastrear pelo userId autenticado, ignorando IDs arbitrários");
  });
}
