import assert from "node:assert";
import { saveChatMessage } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part09(ctx) {
  const { test, userId } = ctx;
  // Teste 12: Usuários não conseguem alterar ou sobrescrever mensagens de terceiros
  await test("12. Usuário não autorizado é impedido de sobrescrever mensagens de outros usuários", async () => {
    const env10 = createMockEnv();
    await saveChatMessage({
      id: "victim_msg_1",
      userId: "victim_user",
      mediaType: "text",
      textCiphertext: "original",
      textIv: "iv1",
      createdAt: Date.now()
    }, env10);

    let idorBlocked = false;
    try {
      await saveChatMessage({
        id: "victim_msg_1",
        userId: "attacker_user",
        mediaType: "text",
        textCiphertext: "adulterado",
        textIv: "iv2",
        createdAt: Date.now()
      }, env10);
    } catch (err) {
      idorBlocked = err.message.includes("Não autorizado");
    }
    assert.strictEqual(idorBlocked, true, "Sobrescrita de mensagem alheia via manipulação de ID deve ser bloqueada");
  });
}
