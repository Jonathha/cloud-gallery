import { jsonResponse, corsHeaders } from "./workerHelpers.js";
import { decryptWorkerBuffer } from "./workerChatMediaHelpers.js";
import { verifyChatMediaSignature } from "./workerChatMediaAuth.js";
import { validateBanco1Token } from "./workerChatAuth.js";

export async function handleChatMediaGet(request, env) {
  const url = new URL(request.url);
  const prefix = "/api/chat/media/";
  const key = decodeURIComponent(url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : "");
  if (!key || key.includes("..") || (!key.startsWith("AUDIOS/") && !key.startsWith("audio/")) || !key.endsWith(".wav.enc")) {
    return jsonResponse({ success: false, error: "Arquivo inválido." }, 400);
  }

  const signedAccess = await verifyChatMediaSignature(key, url.searchParams.get("exp"), url.searchParams.get("sig"), env);
  let user = null;
  if (!signedAccess) {
    try {
      user = await validateBanco1Token(request.headers.get("Authorization"));
    } catch {
      return jsonResponse({ success: false, error: "Acesso não autorizado." }, 401);
    }
  }

  const bucket = env.CHAT_R2 || env.R2;
  if (!bucket) return jsonResponse({ success: false, error: "R2 não configurado." }, 500);
  const object = await bucket.get(key);
  if (!object) return jsonResponse({ success: false, error: "Chat media not found in R2" }, 404);

  let decrypted;
  try {
    decrypted = await decryptWorkerBuffer(new Uint8Array(await object.arrayBuffer()));
  } catch (err) {
    console.error("[ChatMediaGet] decrypt failed:", err);
    return jsonResponse({ success: false, error: "Falha ao descriptografar o áudio." }, 500);
  }

  return new Response(decrypted, {
    headers: {
      ...corsHeaders,
      "Content-Type": object.httpMetadata?.contentType || "audio/wav",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
