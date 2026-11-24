import { jsonResponse, corsHeaders } from "../../workerHelpers.js";
import { ensureChatGlobalSchema, saveChatMessage } from "../../chatGlobalD1.js";
import { auth } from "./chatProfileApi.js";
import { validateMessagePayload } from "./chatMessageValidation.js";
import { fetchChatMessagesList } from "./persistence/chatFetchMessages.js";
import { resolveChatUserProfile } from "./persistence/chatProfileResolver.js";
import { validateChatAudioAttachment } from "./persistence/chatAudioValidator.js";
import { bumpUserVersion } from "../../userSync.js";
import { CHAT_GLOBAL_SYNC_KEY } from "./chatPushApi.js";
import { dispatchChatPushNotifications } from "./chatWebPush.js";
import { maybeTriggerAiAssistant } from "./chatAiAssistant.js";

/**
 * Handles chat message retrieval and message publishing in D1
 */
export async function handleChatMessages(request, env, ctx) {
  try {
    const user = await auth(request);
    await ensureChatGlobalSchema(env);

    if (request.method === "GET") {
      return await fetchChatMessagesList(request, env);
    }

    const body = await request.json().catch(() => ({}));
    const profile = await resolveChatUserProfile(user, env);

    const message = await validateMessagePayload(body, request, user);
    message.userName = profile.username;

    if (message.mediaType === "audio") {
      const { errorResponse } = await validateChatAudioAttachment(message, request, user, env);
      if (errorResponse) return errorResponse;
    }

    await saveChatMessage(message, env);
    const notifyWork = Promise.all([
      bumpUserVersion(CHAT_GLOBAL_SYNC_KEY),
      dispatchChatPushNotifications(message, env).catch(err => {
        console.error("[handleChatMessages] Web Push dispatch error:", err);
      }),
      maybeTriggerAiAssistant(message, env, ctx).catch(() => {})
    ]);
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(notifyWork);
    } else {
      await notifyWork;
    }
    return jsonResponse({ success: true, message });
  } catch (err) {
    if (err && err.rateLimited) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message,
        rateLimited: true,
        retryAfter: err.retryAfter,
        limitType: err.limitType || "messages"
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(err.retryAfter || 60) }
      });
    }
    return jsonResponse({ success: false, error: err.message || "Erro ao salvar mensagem." }, 500);
  }
}
