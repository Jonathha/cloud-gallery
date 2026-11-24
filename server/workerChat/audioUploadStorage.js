import { encryptWorkerBuffer } from "../workerChatMediaHelpers.js";
import { completeAudioUploadSlot, recordPendingMediaCleanup, releaseAudioUploadSlot } from "../chatGlobalD1.js";

/**
 * Encrypts audio payload, stores in R2, and links reservation slot in D1
 */
export async function persistAudioUpload(bytes, durationMs, user, reservationId, env) {
  const bucket = env.CHAT_R2 || env.R2;
  if (!bucket) {
    await releaseAudioUploadSlot(reservationId, env);
    throw new Error("R2 do Chat não está configurado.");
  }

  const key = "AUDIOS/" + crypto.randomUUID() + ".wav.enc";
  const encryptedBytes = await encryptWorkerBuffer(bytes);

  await bucket.put(key, encryptedBytes, {
    httpMetadata: { contentType: "audio/wav" },
    customMetadata: {
      userId: user.uid,
      durationMs: String(Math.round(durationMs)),
      originalSize: String(bytes.length)
    }
  });

  try {
    await completeAudioUploadSlot(reservationId, key, env);
  } catch (completeErr) {
    console.error("[ChatUpload] Falha ao concluir reserva de upload no D1:", completeErr);
    try {
      await bucket.delete(key);
    } catch (delErr) {
      await recordPendingMediaCleanup(key, "upload_completion_failed", delErr?.message || completeErr?.message, env);
    }
    await releaseAudioUploadSlot(reservationId, env).catch(() => {});
    throw new Error("Falha ao registrar a conclusão do envio de áudio no banco de dados. Tente novamente.");
  }

  return { key, url: "/api/chat/media/" + encodeURIComponent(key) };
}
