import { jsonResponse } from "../../workerHelpers.js";
import { getUserVersion } from "../../userSync.js";
import { auth } from "./chatProfileApi.js";
import {
  getOrCreateVapidKeys,
  upsertPushSubscription,
  removePushSubscription
} from "../../chat/d1PushSubscriptions.js";

export const CHAT_GLOBAL_SYNC_KEY = "__chat_global__";

function isValidPushEndpoint(endpoint) {
  if (typeof endpoint !== "string" || endpoint.length < 16 || endpoint.length > 2048) return false;
  try {
    const parsed = new URL(endpoint);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function handleChatVersion(request, env) {
  try {
    await auth(request);
    const version = await getUserVersion(CHAT_GLOBAL_SYNC_KEY);
    return jsonResponse({ success: true, version });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Não autorizado." }, 401);
  }
}

export async function handleChatVapidKey(request, env) {
  try {
    await auth(request);
    const { publicKey } = await getOrCreateVapidKeys(env);
    return jsonResponse({ success: true, publicKey });
  } catch (err) {
    const status = err?.message?.includes("token") || err?.message?.includes("Authorization") ? 401 : 500;
    return jsonResponse({ success: false, error: err.message || "Falha ao obter chave VAPID." }, status);
  }
}

export async function handleChatPushSubscribe(request, env) {
  try {
    const user = await auth(request);
    const body = await request.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const authKey = body?.keys?.auth;

    if (!isValidPushEndpoint(endpoint) || typeof p256dh !== "string" || typeof authKey !== "string" || !p256dh || !authKey) {
      return jsonResponse({ success: false, error: "Inscrição push inválida." }, 400);
    }

    await upsertPushSubscription(user.uid, { endpoint, keys: { p256dh, auth: authKey } }, env);
    return jsonResponse({ success: true });
  } catch (err) {
    const status = err?.message?.includes("token") || err?.message?.includes("Authorization") ? 401 : 500;
    return jsonResponse({ success: false, error: err.message || "Falha ao registrar notificação." }, status);
  }
}

export async function handleChatPushUnsubscribe(request, env) {
  try {
    const user = await auth(request);
    const body = await request.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    if (!isValidPushEndpoint(endpoint)) {
      return jsonResponse({ success: false, error: "Endpoint inválido." }, 400);
    }

    await removePushSubscription(user.uid, endpoint, env);
    return jsonResponse({ success: true });
  } catch (err) {
    const status = err?.message?.includes("token") || err?.message?.includes("Authorization") ? 401 : 500;
    return jsonResponse({ success: false, error: err.message || "Falha ao remover notificação." }, status);
  }
}
