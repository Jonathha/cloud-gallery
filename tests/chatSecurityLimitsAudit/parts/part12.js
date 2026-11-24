import assert from "node:assert";
import { reserveAudioUploadSlot, completeAudioUploadSlot } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part12(ctx) {
  const { test } = ctx;
  // Teste 16: Falha ao concluir reserva de upload no D1 impede sucesso e garante recuperação do arquivo
  await test("16. Falha ao concluir reserva de upload no D1 lança erro e não mascara status", async () => {
    const env14 = createMockEnv();
    const user14 = "user_complete_fail";

    const res = await reserveAudioUploadSlot(user14, env14);
    assert.ok(res.id);

    // Simula falha de D1 ao concluir upload
    env14.__failQueryMatch = "UPDATE chat_global_audio_uploads SET key = ?, status = 'uploaded'";

    let failed = false;
    try {
      await completeAudioUploadSlot(res.id, "AUDIOS/test_failed_complete.wav.enc", env14);
    } catch (err) {
      failed = true;
    }
    assert.strictEqual(failed, true, "completeAudioUploadSlot deve falhar e não mascarar erro com catch vazio");

    // Testa ID inexistente com changes 0
    env14.__failQueryMatch = null;
    let notFoundFailed = false;
    try {
      await completeAudioUploadSlot("non_existent_slot_id", "AUDIOS/abc.wav.enc", env14);
    } catch (err) {
      notFoundFailed = err.message.includes("não encontrada");
    }
    assert.strictEqual(notFoundFailed, true, "ID de reserva inválido ou não atualizado deve lançar erro");
  });
}
