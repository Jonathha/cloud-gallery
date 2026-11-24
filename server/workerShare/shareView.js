import { jsonResponse } from "../workerHelpers.js";
import { extractIdFromUrl, isValidShareId } from "./helpers.js";
import { getShareR2 } from "./r2.js";
import { getShareForViewD1 } from "../workerD1Shares.js";

export async function handleViewShare(url, env, request) {
  const shareId = extractIdFromUrl(url);
  if (!shareId || !isValidShareId(shareId)) return jsonResponse({ success: false, error: "Invalid ID" }, 400);

  const db = env.DB || env.DATABASE || env.d1;
  const bucket = env.R2;
  if (!db || !bucket) {
    return jsonResponse({ success: false, error: "Serviço de compartilhamento temporariamente indisponível." }, 503);
  }

  let shareData;
  try {
    shareData = await getShareR2(bucket, shareId);
  } catch (err) {
    console.error("[handleViewShare] R2 lookup failed:", err);
    return jsonResponse({ success: false, error: "Não foi possível consultar o compartilhamento." }, 503);
  }
  if (!shareData) return jsonResponse({ success: false, error: "Link de compartilhamento não encontrado, revogado ou expirado." }, 404);

  let d1Share;
  try {
    const clientIp = request?.headers?.get?.("CF-Connecting-IP") || request?.headers?.get?.("x-forwarded-for") || "0.0.0.0";
    d1Share = await getShareForViewD1(db, shareId, clientIp);
  } catch (err) {
    console.error("[handleViewShare] D1 lookup failed:", err);
    return jsonResponse({ success: false, error: "Não foi possível validar o compartilhamento." }, 503);
  }
  if (d1Share?.highDemand) return jsonResponse({ success: false, highDemand: true, error: "Este compartilhamento está com alta demanda." }, 429);
  if (!d1Share) return jsonResponse({ success: false, error: "Link de compartilhamento não encontrado, revogado ou expirado." }, 404);

  const merged = {
    ...shareData, ...d1Share, id: shareId,
    firstViewedAt: d1Share.firstViewedAt || shareData.firstViewedAt || null,
    firstViewerIp: d1Share.firstViewerIp || shareData.firstViewerIp || null
  };
  const expiresAt = merged.options?.expiresAt || merged.expiresAt;
  if (expiresAt && Number(expiresAt) <= Date.now()) {
    return jsonResponse({ success: false, error: "Link de compartilhamento expirado." }, 410);
  }
  return jsonResponse({ success: true, share: merged });
}
