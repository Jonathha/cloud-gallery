import assert from "node:assert";
import { saveChatMessage, reserveAudioUploadSlot, completeAudioUploadSlot, recordPendingMediaCleanup, processPendingMediaCleanups, reconcileAbandonedAudioUploads } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part08(ctx) {
  const { test, userId } = ctx;
  // Teste 10: Falha temporária na exclusão do R2 é registrada e recuperada posteriormente
  await test("10. Falha temporária de exclusão no R2 é gravada em fila no D1 e recuperada na conciliação", async () => {
    const env8 = createMockEnv();
    const deletedKey = "AUDIOS/retry_cleanup_999.wav.enc";
    await env8.CHAT_R2.put(deletedKey, new Uint8Array([4, 5, 6]), { customMetadata: { userId: "admin" } });

    // Simula falha temporária no R2 e registra na fila de cleanup
    await recordPendingMediaCleanup(deletedKey, "message_deleted", "Simulated timeout", env8);

    // Agora processa a fila de retentativas
    const cleanupResult = await processPendingMediaCleanups(env8);
    assert.strictEqual(cleanupResult.succeeded, 1, "A retentativa deve processar e excluir o arquivo com sucesso");
    assert.strictEqual(await env8.CHAT_R2.head(deletedKey), null, "O arquivo foi removido do R2 na retentativa");
  });

  // Teste 11: Arquivos válidos vinculados a mensagens NUNCA são apagados
  await test("11. Arquivos válidos associados a mensagens existentes nunca são apagados pela reconciliação", async () => {
    const env9 = createMockEnv();
    const validKey = "AUDIOS/legit_message_audio.wav.enc";
    await env9.CHAT_R2.put(validKey, new Uint8Array([7, 8, 9]), { customMetadata: { userId: "user_valid" } });

    // Mensagem válida salva no D1
    await saveChatMessage({
      id: "valid_msg_1",
      userId: "user_valid",
      mediaType: "audio",
      audioUrl: `/api/chat/media/${encodeURIComponent(validKey)}`,
      createdAt: Date.now() - (30 * 60 * 1000) // mensagem antiga
    }, env9);

    // Registra upload antigo correspondente
    const res = await reserveAudioUploadSlot("user_valid", env9);
    await completeAudioUploadSlot(res.id, validKey, env9);
    const row = env9.__d1Tables.chat_global_audio_uploads.get(res.id);
    row.created_at = Date.now() - (30 * 60 * 1000);

    // Roda reconciliação
    const result = await reconcileAbandonedAudioUploads(env9, 15 * 60 * 1000);
    assert.strictEqual(result.preserved, 1, "O áudio associado à mensagem existente deve ser preservado");
    assert.strictEqual(result.cleaned, 0, "Nenhum áudio válido deve ser excluído");
    assert.ok(await env9.CHAT_R2.head(validKey), "O arquivo legítimo continua intacto no R2");
  });
}
