import { jsonResponse } from "./workerHelpers.js";
import { decryptWorkerBuffer } from "./workerChatMediaHelpers.js";

export async function handleChatMediaGet(request, env) {
  const url = new URL(request.url);
  const fileName = url.pathname.split("/").pop();
  if (!fileName) {
    return jsonResponse({ success: false, error: "Invalid file name" }, 400);
  }
  
  const returnMedia = async (objectOrBytes) => {
    const arrBuffer = await objectOrBytes.arrayBuffer();
    const encryptedBytes = new Uint8Array(arrBuffer);
    const contentType = objectOrBytes.httpMetadata?.contentType || "application/octet-stream";
    const decryptedBytes = await decryptWorkerBuffer(encryptedBytes);
    return new Response(decryptedBytes, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      }
    });
  };

  const bucket = env.CHAT_R2 || env.R2;
  if (bucket) {
    const object = await bucket.get(fileName);
    if (object) return returnMedia(object);
  }
  
  return jsonResponse({ success: false, error: "Chat media not found in R2" }, 404);
}

