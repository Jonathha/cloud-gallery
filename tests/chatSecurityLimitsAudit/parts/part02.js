import assert from "node:assert";
import { saveChatMessage, reserveAudioUploadSlot, completeAudioUploadSlot } from "../../../server/chatGlobalD1.js";

export async function part02(ctx) {
  const { test, userId, env2, user2 } = ctx;
  // Teste 2 e 3: Limite específico de 5 uploads de áudio
  await test("2. O quinto áudio pode ser enviado e o sexto é rejeitado com 429", async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await reserveAudioUploadSlot(user2, env2);
      await completeAudioUploadSlot(res.id, `AUDIOS/test_${i}.wav.enc`, env2);
      await saveChatMessage({
        id: `audio_msg_${i}`,
        userId: user2,
        mediaType: "audio",
        audioUrl: `/api/chat/media/AUDIOS%2Ftest_${i}.wav.enc`,
        createdAt: Date.now()
      }, env2);
    }

    // 6º áudio deve ser rejeitado na reserva
    let rejectedAudio = false;
    try {
      await reserveAudioUploadSlot(user2, env2);
    } catch (err) {
      rejectedAudio = err.rateLimited === true && err.limitType === "audio";
      assert.ok(err.message.includes("Limite de áudios atingido"));
      assert.ok(err.retryAfter > 0);
    }
    assert.strictEqual(rejectedAudio, true, "O 6º áudio deve ser rejeitado mesmo com menos de 20 mensagens totais");
  });
}
