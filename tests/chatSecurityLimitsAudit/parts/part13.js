import assert from "node:assert";
import { saveChatMessage, reserveAudioUploadSlot, completeAudioUploadSlot, reconcileAbandonedAudioUploads } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part13(ctx) {
  const { test, userId } = ctx;
  // Teste 17: Falha ao persistir mensagem não deixa áudio permanentemente marcado como vinculado
  await test("17. Falha ao salvar mensagem não deixa áudio como linked e permite reconciliação do órfão", async () => {
    const env15 = createMockEnv();
    const user15 = "user_link_order_test";
    const audioKey = "AUDIOS/orphan_on_msg_fail.wav.enc";

    // 1. Reserva e conclui upload normalmente
    const res = await reserveAudioUploadSlot(user15, env15);
    await completeAudioUploadSlot(res.id, audioKey, env15);
    await env15.CHAT_R2.put(audioKey, new Uint8Array([10, 20, 30]), { customMetadata: { userId: user15 } });

    const slotBefore = env15.__d1Tables.chat_global_audio_uploads.get(res.id);
    assert.strictEqual(slotBefore.status, "uploaded");

    // 2. Simula falha ao persistir chunks da mensagem
    env15.__failQueryMatch = "chat_global_json_chunks";

    let msgSaveFailed = false;
    try {
      await saveChatMessage({
        id: "msg_will_fail_to_save",
        userId: user15,
        mediaType: "audio",
        audioUrl: `/api/chat/media/${encodeURIComponent(audioKey)}`,
        createdAt: Date.now()
      }, env15);
    } catch (err) {
      msgSaveFailed = true;
    }

    assert.strictEqual(msgSaveFailed, true, "Salvar a mensagem deve ter falhado devido ao D1");

    // 3. Verifica que o slot NÃO ficou como 'linked'
    const slotAfter = env15.__d1Tables.chat_global_audio_uploads.get(res.id);
    assert.strictEqual(slotAfter.status, "uploaded", "O áudio deve continuar como 'uploaded', NUNCA como 'linked'");
    assert.strictEqual(slotAfter.linked_message_id, undefined, "Não pode ter mensagem vinculada");

    // 4. Executa reconciliação após tolerância: o arquivo órfão DEVE ser limpo
    env15.__failQueryMatch = null;
    slotAfter.created_at = Date.now() - (20 * 60 * 1000); // Envelhece o upload

    const reconcileResult = await reconcileAbandonedAudioUploads(env15, 15 * 60 * 1000);
    assert.strictEqual(reconcileResult.cleaned, 1, "O áudio órfão de mensagem com falha deve ser limpo");
    assert.strictEqual(await env15.CHAT_R2.head(audioKey), null, "Arquivo órfão excluído do R2 com sucesso");
  });
}
