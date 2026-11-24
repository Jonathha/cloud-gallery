import assert from "node:assert";
import { saveChatMessage, reserveAudioUploadSlot, completeAudioUploadSlot, recordPendingMediaCleanup, runAutoChatMediaMaintenance } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part14(ctx) {
  const { test, userId } = ctx;
  // Teste 18: Mecanismo automático de limpeza periódica e reconciliação
  await test("18. Mecanismo automático de manutenção executa retentativas e reconciliação com segurança", async () => {
    const env16 = createMockEnv();
    const orphanKey = "AUDIOS/auto_orphan.wav.enc";
    const retryKey = "AUDIOS/auto_retry.wav.enc";
    const validKey = "AUDIOS/auto_valid.wav.enc";

    // 1. Áudio órfão antigo
    await env16.CHAT_R2.put(orphanKey, new Uint8Array([1]), { customMetadata: { userId: "u16" } });
    const orphanRes = await reserveAudioUploadSlot("u16", env16);
    await completeAudioUploadSlot(orphanRes.id, orphanKey, env16);
    env16.__d1Tables.chat_global_audio_uploads.get(orphanRes.id).created_at = Date.now() - (30 * 60 * 1000);

    // 2. Fila de limpeza pendente
    await env16.CHAT_R2.put(retryKey, new Uint8Array([2]), { customMetadata: { userId: "u16" } });
    await recordPendingMediaCleanup(retryKey, "message_deleted", "Network error", env16);

    // 3. Áudio legítimo em mensagem existente
    await env16.CHAT_R2.put(validKey, new Uint8Array([3]), { customMetadata: { userId: "u16" } });
    const validRes = await reserveAudioUploadSlot("u16", env16);
    await completeAudioUploadSlot(validRes.id, validKey, env16);
    await saveChatMessage({
      id: "valid_msg_auto",
      userId: "u16",
      mediaType: "audio",
      audioUrl: `/api/chat/media/${encodeURIComponent(validKey)}`,
      createdAt: Date.now()
    }, env16);

    // Executa manutenção automática
    await runAutoChatMediaMaintenance(env16);

    // Órfão foi excluído do R2
    assert.strictEqual(await env16.CHAT_R2.head(orphanKey), null, "Órfão deve ter sido removido");
    // Fila pendente foi processada e excluída do R2
    assert.strictEqual(await env16.CHAT_R2.head(retryKey), null, "Retentativa pendente deve ter sido executada");
    // Mensagem legítima foi preservada
    assert.ok(await env16.CHAT_R2.head(validKey), "Áudio de mensagem ativa deve ser preservado intacto");
  });
}
