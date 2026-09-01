import { jsonResponse } from "../workerHelpers.js";
import { extractIdFromUrl, isValidShareId, getClientIp } from "./helpers.js";
import { getShareR2 } from "./r2.js";
import { getShareDocFirestore } from "./firestore.js";
import { getFirestoreDocREST } from "../workerFirestoreREST.js";

export async function handleViewShare(url, env, request) {
  const reqObj = request || (url && url.headers ? url : null);
  const shareId = extractIdFromUrl(url);

  if (!shareId || !isValidShareId(shareId)) {
    return jsonResponse({ success: false, error: "Invalid ID" }, 400);
  }

  const bucket = env.R2 || env.CHAT_R2;
  let shareData = null;

  if (bucket) {
    shareData = await getShareR2(bucket, shareId);
  }

  if (!shareData) {
    return jsonResponse({ success: false, error: "Link de compartilhamento não encontrado ou expirado." }, 404);
  }

  // 1 & 2 & 3. Valide o share e confirme no Firestore que a mídia original ainda existe.
  // Como shares são deletados atomicamente junto com a mídia original,
  // a presença do share no Firestore garante a validade da mídia associada.
  try {
    const fsShare = await getShareDocFirestore(shareId, null);
    if (!fsShare) {
      // A mídia original foi excluída (ou share invalidado) e o documento foi apagado do Firestore.
      if (bucket) {
        try { await bucket.delete(`shares/${shareId}.json`); } catch (e) {}
      }
      return jsonResponse({ success: false, error: "Link de compartilhamento inválido ou a mídia original foi excluída." }, 404);
    }
  } catch (err) {
    console.warn("[Worker] Failed to validate share doc in Firestore:", err);
  }

  // Validação direta da mídia original (fallback em caso de dessincronização)
  if (shareData.imageId) {
    try {
      const imgDoc = await getFirestoreDocREST('images', shareData.imageId, null);
      if (imgDoc === null) {
        // Documento da imagem comprovadamente não existe (404)
        if (bucket) {
           try { await bucket.delete(`shares/${shareId}.json`); } catch(e) {}
        }
        return jsonResponse({ success: false, error: "Link de compartilhamento inválido ou a mídia original foi excluída." }, 404);
      }
    } catch (err) {
      // 403 Forbidden é esperado aqui para usuários não autenticados devido às regras de segurança.
      // O fluxo pode prosseguir normalmente.
    }
  }

  const now = Date.now();
  const expiresAt = shareData.options?.expiresAt || shareData.expiresAt;

  if (expiresAt && now > Number(expiresAt)) {
    if (bucket) {
      try {
        await bucket.delete(`shares/${shareId}.json`);
      } catch {}
    }
    return jsonResponse({ success: false, error: "Este link de compartilhamento expirou (limite de 1 hora)." }, 410);
  }

  const clientIp = getClientIp(reqObj);

  if (shareData.options?.oneTimeView) {
    if (!shareData.firstViewedAt) {
      shareData.firstViewedAt = now;
      shareData.firstViewerIp = clientIp;
      if (bucket) {
        try {
          await bucket.put(`shares/${shareId}.json`, JSON.stringify(shareData));
        } catch {}
      }
    } else {
      const secondsElapsed = (now - Number(shareData.firstViewedAt)) / 1000;
      if (secondsElapsed > 60) {
        if (bucket) {
          try {
            await bucket.delete(`shares/${shareId}.json`);
          } catch {}
        }
        return jsonResponse({ success: false, error: "Esta visualização única expirou. O limite de 1 minuto foi atingido e o arquivo foi excluído permanentemente." }, 403);
      }
      if (shareData.firstViewerIp && shareData.firstViewerIp !== clientIp) {
        return jsonResponse({ success: false, error: "Acesso bloqueado: Este link de visualização única está travado no dispositivo inicial." }, 403);
      }
    }
  }

  return jsonResponse({
    success: true,
    share: {
      id: shareData.id || shareId,
      ciphertext: shareData.ciphertext,
      iv: shareData.iv,
      contentType: shareData.contentType || 'image/png',
      isChunked: shareData.isChunked || false,
      chunkCount: shareData.chunkCount || 1,
      totalSize: shareData.totalSize || 0,
      options: {
        requirePassword: !!shareData.options?.requirePassword,
        encryptedShareKey: shareData.options?.encryptedShareKey || null,
        ivShareKey: shareData.options?.ivShareKey || null,
        allowDownload: shareData.options?.allowDownload !== false,
        oneTimeView: !!shareData.options?.oneTimeView,
        expiresAt: shareData.options?.expiresAt || null
      },
      firstViewedAt: shareData.firstViewedAt || null,
      clientIp
    }
  });
}
