import { jsonResponse } from "../../../workerHelpers.js";
import { getChatMessagesPage } from "../../../chatGlobalD1.js";
import { createChatMediaSignature, getMediaKeyFromUrl } from "../../../workerChatMediaAuth.js";
import { maybeContinueAi } from "../ai/chatAiOrchestrator.js";

/**
 * Handles fetching chat messages list and signing audio media URLs
 * Formats signed URLs with expiration and signature query parameters
 */
export async function fetchChatMessagesList(request, env, ctx) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 100);
  const beforeParam = url.searchParams.get("before");
  const beforeId = url.searchParams.get("beforeId");
  let cursor = null;
  if (beforeParam !== null && beforeParam !== "") {
    const before = Number(beforeParam);
    if (!Number.isFinite(before)) {
      return jsonResponse({ success: false, error: "Parâmetro 'before' inválido." }, 400);
    }
    cursor = { before, beforeId };
  }
  const { messages, hasMore } = await getChatMessagesPage(limit, cursor, env);

  for (const message of messages) {
    if (message.mediaType !== "audio" || !message.audioUrl) {
      continue;
    }
    const key = getMediaKeyFromUrl(message.audioUrl, request.url);
    if (!key) {
      message.audioUrl = undefined;
      continue;
    }
    const signed = await createChatMediaSignature(key, env, 300);
    const encodedKey = encodeURIComponent(key);
    const expParam = signed.exp;
    const sigParam = encodeURIComponent(signed.sig);
    const signedUrl = `/api/chat/media/${encodedKey}?exp=${expParam}&sig=${sigParam}`;
    message.audioUrl = signedUrl;
  }

  if (!cursor && ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(maybeContinueAi(env).catch(() => {}));
  }

  return jsonResponse({ success: true, messages, hasMore });
}
