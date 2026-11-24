import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { getUserVersion } from "./userSync.js";
import { getUserMetadataList, repairStaleD1UserMetadataFromR2 } from "./workerD1Storage.js";

export async function handleListImages(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return jsonResponse({ success: false, error: "userId parameter is required" }, 400);
  }

  const authHeader = request.headers.get("Authorization");
  let verifiedUser;
  try {
    verifiedUser = await validateBanco1Token(authHeader);
    if (verifiedUser.uid !== userId) {
      return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar estes arquivos." }, 403);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  // D1 Storage for User Metadata
  if (env.DB) {
    try {
      // Versão lida ANTES da lista: se algo mudar no meio, o cliente apenas rebaixa na próxima vez
      const version = await getUserVersion(userId);
      // Fetch all items across this user's D1 chunks
      let userItems = await getUserMetadataList(env.DB, userId);

      // Auto-repair stale encryption metadata from R2 headers for recovered mídias ONLY on-demand
      const bucket = env.R2 || env.CHAT_R2;
      const forceRepair = url.searchParams.get("repair") === "true";
      const repairId = url.searchParams.get("repairId");
      if (bucket && (forceRepair || repairId)) {
        userItems = await repairStaleD1UserMetadataFromR2(env.DB, bucket, userId, userItems, forceRepair ? null : repairId);
      }

      const regularImages = userItems.filter(item => !item.isProtected);
      return jsonResponse({ success: true, images: regularImages, version });
    } catch (d1Err) {
      console.error("[WorkerStorageList] D1 fetch error:", d1Err);
    }
  }

  return jsonResponse({ success: true, images: [] });
}

export async function handleListProtectedImages(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return jsonResponse({ success: false, error: "userId parameter is required" }, 400);
  }

  const authHeader = request.headers.get("Authorization");
  let verifiedUser;
  try {
    verifiedUser = await validateBanco1Token(authHeader);
    if (verifiedUser.uid !== userId) {
      return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar estes arquivos." }, 403);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  if (env.DB) {
    try {
      let userItems = await getUserMetadataList(env.DB, userId);

      // Auto-repair stale encryption metadata from R2 headers for recovered protected mídias ONLY on-demand
      const bucket = env.R2 || env.CHAT_R2;
      const forceRepair = url.searchParams.get("repair") === "true";
      const repairId = url.searchParams.get("repairId");
      if (bucket && (forceRepair || repairId)) {
        userItems = await repairStaleD1UserMetadataFromR2(env.DB, bucket, userId, userItems, forceRepair ? null : repairId);
      }

      const protectedImages = userItems.filter(item => !!item.isProtected);
      return jsonResponse({ success: true, images: protectedImages });
    } catch (d1Err) {
      console.error("[WorkerStorageList] D1 protected fetch error:", d1Err);
    }
  }

  return jsonResponse({ success: true, images: [] });
}



/** Versão de sincronização do usuário (não toca no D1). null = indisponível, o cliente baixa a lista. */
export async function handleUserVersion(request, env) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return jsonResponse({ success: false, error: "userId parameter is required" }, 400);
  }
  try {
    const verifiedUser = await validateBanco1Token(request.headers.get("Authorization"));
    if (verifiedUser.uid !== userId) {
      return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar estes arquivos." }, 403);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }
  return jsonResponse({ success: true, version: await getUserVersion(userId) });
}
