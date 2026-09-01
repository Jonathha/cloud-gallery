import { jsonResponse, corsHeaders } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { getFirestoreDocREST } from "./workerFirestoreREST.js";

export async function handleGetThumbnail(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) {
    return jsonResponse({ success: false, error: "Invalid ID" }, 400);
  }

  const authHeader = request.headers.get("Authorization");
  let verifiedUser;
  try {
    verifiedUser = await validateBanco1Token(authHeader);
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";
  if (!idToken) {
    return jsonResponse({ success: false, error: "Acesso não autorizado: token de sessão ausente" }, 401);
  }

  // Validate ownership in Firestore (the source of truth) using the user's authentic token
  let isOwnerOfMedia = false;
  try {
    const imgDoc = await getFirestoreDocREST('images', id, idToken);
    if (imgDoc && imgDoc.userId === verifiedUser.uid) {
      isOwnerOfMedia = true;
    } else {
      const keyDoc = await getFirestoreDocREST('media_keys', id, idToken);
      if (keyDoc && keyDoc.userId === verifiedUser.uid) {
        isOwnerOfMedia = true;
      }
    }
  } catch (dbErr) {
    console.warn('[handleGetThumbnail] Firestore REST verification failed:', dbErr);
  }

  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar este arquivo." }, 403);
  }

  let buffer;
  const r2Binding = env.R2 || env.CHAT_R2;
  if (r2Binding) {
    try {
      let obj = await r2Binding.get(`thumbnails/${id}.enc`);
      if (obj) {
        buffer = await obj.arrayBuffer();
      } else {
        let imgObj = await r2Binding.get(`images/${id}.enc`);
        if (imgObj) {
          const imgBuf = await imgObj.arrayBuffer();
          const view = new DataView(imgBuf);
          if (imgBuf.byteLength >= 8) {
            const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
            if (magic === 0x454e4332) {
              const metaLen = view.getUint32(4, false);
              const metaBytes = new Uint8Array(imgBuf, 8, metaLen);
              const metadata = JSON.parse(new TextDecoder().decode(metaBytes));
              const thumbSize = metadata.thumbSize || 0;
              if (thumbSize > 0) {
                const thumbBytes = new Uint8Array(imgBuf, 8 + metaLen, thumbSize);
                const thumbMetaStr = JSON.stringify({
                  id,
                  contentType: "image/jpeg",
                  iv: metadata.thumbnailIv || metadata.iv || "",
                  fileSalt: metadata.fileSalt || ""
                });
                const thumbMetaBytes = new TextEncoder().encode(thumbMetaStr);
                const totalLength = 8 + thumbMetaBytes.length + thumbBytes.byteLength;
                const resBuf = new Uint8Array(totalLength);
                const resView = new DataView(resBuf.buffer);
                resView.setUint8(0, 0x45); resView.setUint8(1, 0x4e); resView.setUint8(2, 0x43); resView.setUint8(3, 0x31);
                resView.setUint32(4, thumbMetaBytes.length, false);
                resBuf.set(thumbMetaBytes, 8);
                resBuf.set(thumbBytes, 8 + thumbMetaBytes.length);
                buffer = resBuf.buffer;
              }
            }
          }
        }
      }
    } catch (r2GetErr) {
      console.error(`[Worker R2] Failed getting thumbnail ${id} from R2:`, r2GetErr);
    }
  }

  if (!buffer) {
    return jsonResponse({ success: false, error: "Thumbnail não encontrada" }, 404);
  }

  return new Response(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${id}.enc"`,
      "Cache-Control": "public, max-age=31536000"
    }
  });
}

