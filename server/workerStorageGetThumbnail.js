import { jsonResponse, corsHeaders } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { findUserMediaItem } from "./workerD1Storage.js";

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

  // Validate ownership in D1
  let isOwnerOfMedia = false;
  if (env.DB) {
    try {
      const d1Item = await findUserMediaItem(env.DB, verifiedUser.uid, id);
      if (d1Item) {
        isOwnerOfMedia = true;
      }
    } catch (d1Err) {
      console.warn('[handleGetThumbnail] D1 verification check warning:', d1Err);
    }
  }

  const r2Binding = env.R2 || env.CHAT_R2;

  // Se não foi encontrado no D1, checa se sequer existe no R2 antes de emitir erro de permissão
  if (!isOwnerOfMedia && r2Binding) {
    let existsInStorage = false;
    try {
      const checkObj = await r2Binding.head(`thumbnails/${id}.enc`).catch(() => null) 
        || await r2Binding.head(`images/${id}.enc`).catch(() => null);
      if (checkObj) {
        existsInStorage = true;
      }
    } catch (e) {}

    if (!existsInStorage) {
      return jsonResponse({ success: false, error: "Thumbnail não encontrada" }, 404);
    }

    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar esta miniatura." }, 403);
  } else if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Thumbnail não encontrada" }, 404);
  }

  let buffer;
  if (r2Binding) {
    try {
      let obj = await r2Binding.get(`thumbnails/${id}.enc`);
      if (obj) {
        buffer = await obj.arrayBuffer();
      } else {
        let headerObj = await r2Binding.get(`images/${id}.enc`, { range: { offset: 0, length: 4096 } });
        if (headerObj) {
          const headerBuf = await headerObj.arrayBuffer();
          if (headerBuf.byteLength >= 8) {
            const view = new DataView(headerBuf);
            const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
            if (magic === 0x454e4332) {
              const metaLen = view.getUint32(4, false);
              if (8 + metaLen <= headerBuf.byteLength) {
                const metaBytes = new Uint8Array(headerBuf, 8, metaLen);
                const metadata = JSON.parse(new TextDecoder().decode(metaBytes));
                if (metadata.userId === verifiedUser.uid) {
                  isOwnerOfMedia = true;
                }
                const thumbSize = metadata.thumbSize || 0;
                if (thumbSize > 0) {
                  let thumbBytes;
                  const thumbOffset = 8 + metaLen;
                  if (headerBuf.byteLength >= thumbOffset + thumbSize) {
                    thumbBytes = new Uint8Array(headerBuf, thumbOffset, thumbSize);
                  } else {
                    const thumbObj = await r2Binding.get(`images/${id}.enc`, { range: { offset: thumbOffset, length: thumbSize } });
                    if (thumbObj) {
                      const thumbBuf = await thumbObj.arrayBuffer();
                      thumbBytes = new Uint8Array(thumbBuf);
                    }
                  }

                  if (thumbBytes && thumbBytes.byteLength === thumbSize) {
                    const thumbMetaStr = JSON.stringify({
                      id,
                      contentType: "image/jpeg",
                      iv: metadata.thumbnailIv || metadata.iv || "",
                      thumbnailIv: metadata.thumbnailIv || metadata.iv || "",
                      fileKeyCiphertext: metadata.fileKeyCiphertext || "",
                      fileKeyIv: metadata.fileKeyIv || "",
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
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "Vary": "Authorization"
    }
  });
}

