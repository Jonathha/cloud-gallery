import { jsonResponse } from "./workerHelpers.js";
import { encryptWorkerBuffer } from "./workerChatMediaHelpers.js";

export async function handleChatMediaUpload(request, env) {
  try {
    const body = await request.json();
    const { fileBase64, fileName, contentType } = body;
    if (!fileBase64 || !fileName || !contentType) {
      return jsonResponse({ success: false, error: "Missing required chat file parameters" }, 400);
    }
    
    let base64Data = fileBase64;
    if (fileBase64.includes(";base64,")) {
      base64Data = fileBase64.split(";base64,")[1];
    }
    
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const encryptedBytes = await encryptWorkerBuffer(bytes);
    
    const bucket = env.CHAT_R2 || env.R2;
    if (!bucket) {
      return jsonResponse({ success: false, error: "R2 bucket binding is required" }, 500);
    }

    await bucket.put(fileName, encryptedBytes, {
      httpMetadata: { contentType: contentType }
    });
    console.log(`[Worker] Chat Media Uploaded directly to R2: ${fileName}`);

    return jsonResponse({
      success: true,
      url: `/api/chat/media/${fileName}`
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Failed to upload chat media" }, 500);
  }
}

