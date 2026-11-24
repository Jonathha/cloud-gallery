import { jsonResponse } from "../../../workerHelpers.js";

/**
 * Validates audio attachment ownership, limits, and assigns metadata
 */
export async function validateChatAudioAttachment(message, request, user, env) {
  const bucket = env.CHAT_R2 || env.R2;
  const key = message.audioUrl ? (() => {
    try {
      const parsed = new URL(message.audioUrl, request.url);
      const prefix = "/api/chat/media/";
      return parsed.pathname.startsWith(prefix) ? decodeURIComponent(parsed.pathname.slice(prefix.length)) : null;
    } catch {
      return null;
    }
  })() : null;

  if (!bucket || !key || key.includes("..") || (!key.startsWith("AUDIOS/") && !key.startsWith(`audio/${user.uid}/`)) || !key.endsWith(".wav.enc")) {
    return { errorResponse: jsonResponse({ success: false, error: "Referência de áudio inválida." }, 400) };
  }

  const object = await bucket.head(key);
  if (!object || object.customMetadata?.userId !== user.uid) {
    return { errorResponse: jsonResponse({ success: false, error: "Áudio não pertence ao usuário autenticado." }, 400) };
  }

  const storedDuration = Number(object.customMetadata?.durationMs || 0);
  const storedSize = Number(object.customMetadata?.originalSize || 0);
  if (storedDuration < 1000 || storedDuration > 180000 || storedSize > 3 * 1024 * 1024) {
    return { errorResponse: jsonResponse({ success: false, error: "Parâmetros de áudio inválidos." }, 400) };
  }

  message.audioUrl = `/api/chat/media/${encodeURIComponent(key)}`;
  message.audioDurationMs = storedDuration;
  message.audioSize = storedSize;
  return { errorResponse: null };
}
