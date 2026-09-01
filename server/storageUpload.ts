import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { IMAGES_DIR, checkMediaOwnership } from "./storageHelpers";
import { uploadToR2 } from "./r2Client";
import { isEncBinary, getMetadataFromEnc, updateEncMetadata } from "./storageHelpersEnc";
import { processB2Backups } from "./b2BackupService";
import { AuthenticatedRequest } from "./authMiddleware";

async function getRawBody(req: AuthenticatedRequest, maxSizeBytes: number = 1024 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSizeBytes) {
        req.destroy();
        reject(new Error("Payload too large: Max file upload limit is 1GB"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err) => reject(err));
  });
}

export async function uploadImage(req: AuthenticatedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    if (!authUid) {
      return res.status(401).json({ success: false, error: "Unauthorized: Missing user token" });
    }

    let rawBuffer: Buffer;
    let metadata: any;

    // Check if express.json() has already parsed the request body as an object
    if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0 && req.body.id && req.body.ciphertext) {
      const fileData = req.body;
      metadata = fileData;

      // Wrap JSON to ENC1 binary
      const { ciphertext, ...metaWithoutCiphertext } = fileData;
      const metaBytes = Buffer.from(JSON.stringify(metaWithoutCiphertext), "utf8");
      const ciphertextBytes = Buffer.from(ciphertext || "", "base64");

      const totalLength = 4 + 4 + metaBytes.length + ciphertextBytes.length;
      const wrappedBuffer = Buffer.alloc(totalLength);

      // Write magic 'ENC1'
      wrappedBuffer.write("ENC1", 0, "ascii");
      wrappedBuffer.writeUInt32BE(metaBytes.length, 4);
      metaBytes.copy(wrappedBuffer, 8);
      ciphertextBytes.copy(wrappedBuffer, 8 + metaBytes.length);

      rawBuffer = wrappedBuffer;
    } else {
      rawBuffer = await getRawBody(req);

      if (!isEncBinary(rawBuffer)) {
        // Try JSON fallback (for compatibility with restore and older clients)
        try {
          const text = rawBuffer.toString("utf8");
          const fileData = JSON.parse(text);
          metadata = fileData;

          // Wrap JSON to ENC1 binary
          const { ciphertext, ...metaWithoutCiphertext } = fileData;
          const metaBytes = Buffer.from(JSON.stringify(metaWithoutCiphertext), "utf8");
          const ciphertextBytes = Buffer.from(ciphertext || "", "base64");

          const totalLength = 4 + 4 + metaBytes.length + ciphertextBytes.length;
          const wrappedBuffer = Buffer.alloc(totalLength);

          // Write magic 'ENC1'
          wrappedBuffer.write("ENC1", 0, "ascii");
          wrappedBuffer.writeUInt32BE(metaBytes.length, 4);
          metaBytes.copy(wrappedBuffer, 8);
          ciphertextBytes.copy(wrappedBuffer, 8 + metaBytes.length);

          rawBuffer = wrappedBuffer;
        } catch (jsonErr) {
          return res.status(400).json({ success: false, error: "Formato inválido: esperava arquivo .enc binário ou JSON válido." });
        }
      } else {
        try {
          metadata = getMetadataFromEnc(rawBuffer);
        } catch (err) {
          return res.status(400).json({ success: false, error: "Erro ao extrair metadados do arquivo .enc" });
        }
      }
    }


    const { id, iv } = metadata;
    if (!id || !iv) {
      return res.status(400).json({ success: false, error: "Metadados incompletos no arquivo .enc" });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID format" });
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : undefined;

    // SECURITY: Validate resource existence and prevent overwriting media belonging to another user
    const ownership = await checkMediaOwnership(id, authUid, idToken);
    if (ownership.exists && !ownership.allowed) {
      return res.status(409).json({
        success: false,
        error: "Conflito: Um recurso com este identificador já pertence a outro usuário."
      });
    }

    // SECURITY & DATA INTEGRITY: Server is the sole authority over sensitive metadata fields and timestamps
    const serverTimestamp = Date.now();
    const nowIso = new Date(serverTimestamp).toISOString();
    metadata.userId = authUid;
    delete metadata.createdAt;
    delete metadata.timestamp;
    delete metadata.serverCreatedAt;
    delete metadata.serverTimestamp;
    metadata.createdAt = serverTimestamp;
    metadata.timestamp = serverTimestamp;
    metadata.serverCreatedAt = nowIso;

    const buffer = updateEncMetadata(rawBuffer, metadata);

    const filePath = path.join(IMAGES_DIR, `${id}.enc`);
    await fs.writeFile(filePath, buffer);

    try {
      await uploadToR2(`images/${id}.enc`, buffer, "application/octet-stream");
    } catch (r2Err) {
      console.error(`[StorageControllerUploadDelete] Cloudflare R2 upload failed for ${id}.enc:`, r2Err);
    }
    
    // Trigger B2 Backup asynchronously in the background
    processB2Backups().catch(err => console.error(err));

    res.json({ success: true, createdAt: serverTimestamp, timestamp: serverTimestamp });
  } catch (err: any) {
    console.error('[StorageControllerUploadDelete] Error saving local upload:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
