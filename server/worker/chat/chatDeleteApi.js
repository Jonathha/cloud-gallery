import { jsonResponse } from "../../workerHelpers.js";
import { isUserAdmin } from "../../workerLogs/auth.js";
import { deleteChatMessage, deleteChatMessages, recordPendingMediaCleanup, recordPendingMediaCleanups, markAudioUploadCleaned, markAudioUploadsCleaned, processPendingMediaCleanups } from "../../chatGlobalD1.js";
import { auth } from "./chatProfileApi.js";
import { bumpUserVersion } from "../../userSync.js";
import { CHAT_GLOBAL_SYNC_KEY } from "./chatPushApi.js";

export async function handleChatDeleteD1(request, env) {
  try {
    const user = await auth(request);
    if (!isUserAdmin(user.email, env, user.email_verified)) {
      return jsonResponse({ success: false, error: "Acesso negado." }, 403);
    }
    const body = await request.json().catch(() => ({}));
    if (!body.messageId) return jsonResponse({ success: false, error: "messageId é obrigatório." }, 400);
    const deleted = await deleteChatMessage(body.messageId, env);
    if (!deleted.deleted) return jsonResponse({ success: true, deleted: false });
    await bumpUserVersion(CHAT_GLOBAL_SYNC_KEY);

    let mediaCleanupError = null;
    const mediaKey = deleted.message?.mediaType === "audio" && deleted.message?.audioUrl
      ? (() => {
          try {
            const parsed = new URL(deleted.message.audioUrl, request.url);
            const prefix = "/api/chat/media/";
            return parsed.pathname.startsWith(prefix) ? decodeURIComponent(parsed.pathname.slice(prefix.length)) : null;
          } catch {
            return null;
          }
        })()
      : null;

    if (mediaKey) {
      const bucket = env.CHAT_R2 || env.R2;
      if (bucket) {
        try {
          await bucket.delete(mediaKey);
          await markAudioUploadCleaned(mediaKey, env);
        } catch (err) {
          mediaCleanupError = err?.message || "Falha ao remover o áudio do R2.";
          await recordPendingMediaCleanup(mediaKey, "message_deleted", mediaCleanupError, env);
        }
      }
    }
    await processPendingMediaCleanups(env).catch(() => {});
    return jsonResponse({ success: true, deleted: true, mediaCleanupError });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Erro ao excluir mensagem." }, 500);
  }
}

const MAX_BATCH_DELETE = 100;

export async function handleChatDeleteBatchD1(request, env) {
  try {
    const user = await auth(request);
    if (!isUserAdmin(user.email, env, user.email_verified)) {
      return jsonResponse({ success: false, error: "Acesso negado." }, 403);
    }
    const body = await request.json().catch(() => ({}));
    const raw = body.messageIds;
    if (!Array.isArray(raw) || raw.length === 0 || raw.some(id => typeof id !== "string" || !id)) {
      return jsonResponse({ success: false, error: "messageIds deve ser uma lista não vazia de textos." }, 400);
    }
    const ids = [...new Set(raw)];
    if (ids.length > MAX_BATCH_DELETE) {
      return jsonResponse({ success: false, error: `Máximo de ${MAX_BATCH_DELETE} mensagens por solicitação.` }, 400);
    }

    const { removed } = await deleteChatMessages(ids, env);
    if (removed.length > 0) {
      await bumpUserVersion(CHAT_GLOBAL_SYNC_KEY);
    }

    const prefix = "/api/chat/media/";
    const mediaKeys = [];
    for (const m of removed) {
      if (m?.mediaType !== "audio" || !m.audioUrl) continue;
      try {
        const parsed = new URL(m.audioUrl, request.url);
        if (parsed.pathname.startsWith(prefix)) mediaKeys.push(decodeURIComponent(parsed.pathname.slice(prefix.length)));
      } catch {}
    }

    let mediaCleanupError = null;
    const bucket = env.CHAT_R2 || env.R2;
    if (mediaKeys.length > 0 && bucket) {
      try {
        await bucket.delete(mediaKeys);
        await markAudioUploadsCleaned(mediaKeys, env);
      } catch (err) {
        mediaCleanupError = err?.message || "Falha ao remover áudios do R2.";
        await recordPendingMediaCleanups(mediaKeys, "message_deleted", mediaCleanupError, env).catch(() => {});
      }
    }

    return jsonResponse({
      success: true,
      deleted: removed.length,
      deletedIds: removed.map(m => m.id),
      mediaCleanupError
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Erro ao excluir mensagens." }, 500);
  }
}
