import { jsonResponse, corsHeaders } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChatAuth.js";
import { reserveAudioUploadSlot, releaseAudioUploadSlot } from "./chatGlobalD1.js";
import { validateAudioUploadPayload } from "./workerChat/audioUploadValidation.js";
import { persistAudioUpload } from "./workerChat/audioUploadStorage.js";

/**
 * Handles incoming chat audio uploads with reservation, validation, and storage
 */
export async function handleChatMediaUpload(request, env) {
  let reservationId = null;
  try {
    const user = await validateBanco1Token(request.headers.get("Authorization"));
    const reservation = await reserveAudioUploadSlot(user.uid, env);
    reservationId = reservation.id;

    const bytes = new Uint8Array(await request.arrayBuffer());
    const validation = validateAudioUploadPayload(request, bytes);
    if (validation.error) {
      await releaseAudioUploadSlot(reservationId, env);
      return jsonResponse({ success: false, error: validation.error }, validation.status);
    }

    const { key, url } = await persistAudioUpload(bytes, validation.durationMs, user, reservationId, env);
    return jsonResponse({
      success: true,
      key,
      url,
      durationMs: Math.round(validation.durationMs),
      size: bytes.length
    });
  } catch (err) {
    if (reservationId) await releaseAudioUploadSlot(reservationId, env).catch(() => {});
    if (err && err.rateLimited) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message,
        rateLimited: true,
        retryAfter: err.retryAfter,
        limitType: err.limitType || "audio"
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(err.retryAfter || 60) }
      });
    }
    return jsonResponse({ success: false, error: err.message || "Falha no upload do áudio." }, 400);
  }
}
