import assert from "node:assert";
import { reserveAudioUploadSlot, releaseAudioUploadSlot, completeAudioUploadSlot, reconcileAbandonedAudioUploads } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part07(ctx) {
  const { test, userId } = ctx;
  // Teste 8: Falhas e interrupções de upload liberam reservas
  await test("8. Falhas de upload liberam a reserva e não penalizam indevidamente o usuário", async () => {
    const env6 = createMockEnv();
    const user6 = "user_fail_test";

    // Cria uma reserva e simula falha imediata na validação
    const res = await reserveAudioUploadSlot(user6, env6);
    await releaseAudioUploadSlot(res.id, env6);

    // O usuário ainda deve poder reservar 5 slots normalmente
    for (let i = 1; i <= 5; i++) {
      const validRes = await reserveAudioUploadSlot(user6, env6);
      assert.ok(validRes.id);
    }
  });

  // Teste 9: Áudio órfão (upload sem mensagem) é reconciliado com segurança após tolerância
  await test("9. Áudio órfão no R2 sem mensagem associada é removido pela reconciliação após tolerância", async () => {
    const env7 = createMockEnv();
    const orphanKey = "AUDIOS/orphan_abandoned_123.wav.enc";
    
    // Simula áudio gravado no R2
    await env7.CHAT_R2.put(orphanKey, new Uint8Array([1, 2, 3]), { customMetadata: { userId: "user_orphan" } });
    assert.ok(await env7.CHAT_R2.head(orphanKey));

    // Registra upload com timestamp antigo (> 15 minutos)
    const oldTimestamp = Date.now() - (20 * 60 * 1000);
    const res = await reserveAudioUploadSlot("user_orphan", env7);
    await completeAudioUploadSlot(res.id, orphanKey, env7);

    // Modifica artificialmente o created_at para simular passagem do tempo
    const uploadRow = env7.__d1Tables.chat_global_audio_uploads.get(res.id);
    uploadRow.created_at = oldTimestamp;

    // Executa reconciliação
    const result = await reconcileAbandonedAudioUploads(env7, 15 * 60 * 1000);
    assert.strictEqual(result.cleaned, 1, "Deve limpar exatamente o arquivo órfão");

    // Verifica que o arquivo foi excluído do R2
    const fileAfter = await env7.CHAT_R2.head(orphanKey);
    assert.strictEqual(fileAfter, null, "O arquivo órfão deve ter sido removido do R2");
  });
}
