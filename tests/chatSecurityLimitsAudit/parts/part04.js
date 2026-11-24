import assert from "node:assert";
import { saveChatMessage, reserveAudioUploadSlot, completeAudioUploadSlot } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part04(ctx) {
  const { test, userId } = ctx;
  // Teste 5: Combinação cumulativa e independente (4 áudios e 16 textos atingem limite geral)
  await test("5. 4 áudios e 16 textos atingem o limite geral mesmo sem estourar o limite de áudio", async () => {
    const env3 = createMockEnv();
    const user3 = "user_combo_test";

    // 4 áudios
    for (let i = 1; i <= 4; i++) {
      const res = await reserveAudioUploadSlot(user3, env3);
      await completeAudioUploadSlot(res.id, `AUDIOS/combo_${i}.wav.enc`, env3);
      await saveChatMessage({
        id: `combo_a_${i}`,
        userId: user3,
        mediaType: "audio",
        audioUrl: `/api/chat/media/AUDIOS%2Fcombo_${i}.wav.enc`,
        createdAt: Date.now()
      }, env3);
    }

    // 16 textos
    for (let i = 1; i <= 16; i++) {
      await saveChatMessage({
        id: `combo_t_${i}`,
        userId: user3,
        mediaType: "text",
        textCiphertext: "cifrado",
        textIv: "iv",
        createdAt: Date.now()
      }, env3);
    }

    // Total de 20 mensagens atingido. Tentativa de mais um texto ou áudio deve ser rejeitada
    let generalLimitHit = false;
    try {
      await saveChatMessage({
        id: "combo_exceeded",
        userId: user3,
        mediaType: "text",
        textCiphertext: "cifrado",
        textIv: "iv",
        createdAt: Date.now()
      }, env3);
    } catch (err) {
      generalLimitHit = err.rateLimited === true && err.limitType === "messages";
    }
    assert.strictEqual(generalLimitHit, true, "20 mensagens totais devem atingir o limite geral");
  });
}
