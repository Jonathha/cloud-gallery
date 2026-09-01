import { Response } from "express";
import crypto from "crypto";
import fs from "node:fs/promises";
import path from "path";
import { IMAGES_DIR, checkMediaOwnership } from "./storageHelpers";
import { uploadToR2 } from "./r2Client";
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

function packEncryptedFileServerV2(metadata: any, ciphertextBuffer: Buffer): Buffer {
  let thumbBuffer = Buffer.alloc(0);
  if (metadata.thumbnailCiphertext) {
    try {
      thumbBuffer = Buffer.from(metadata.thumbnailCiphertext, 'base64');
    } catch (e) {
      console.warn("Failed to convert thumbnailCiphertext to Buffer:", e);
    }
  }

  metadata.version = 2;
  metadata.thumbSize = thumbBuffer.length;
  metadata.mediaSize = ciphertextBuffer.length;

  const metaStr = JSON.stringify(metadata);
  const metaBytes = Buffer.from(metaStr, 'utf-8');
  
  const totalLength = 4 + 4 + metaBytes.length + thumbBuffer.length + ciphertextBuffer.length;
  const buffer = Buffer.alloc(totalLength);
  
  // Magic bytes 'ENC2'
  buffer.writeUInt8(0x45, 0); // E
  buffer.writeUInt8(0x4e, 1); // N
  buffer.writeUInt8(0x43, 2); // C
  buffer.writeUInt8(0x32, 3); // 2
  
  // Metadata length (big-endian)
  buffer.writeUInt32BE(metaBytes.length, 4);
  
  // Metadata bytes
  metaBytes.copy(buffer, 8);
  
  // Thumbnail bytes
  if (thumbBuffer.length > 0) {
    thumbBuffer.copy(buffer, 8 + metaBytes.length);
  }

  // Ciphertext bytes
  ciphertextBuffer.copy(buffer, 8 + metaBytes.length + thumbBuffer.length);
  
  return buffer;
}

export async function uploadRawImage(req: AuthenticatedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    if (!authUid) {
      return res.status(401).json({ success: false, error: "Unauthorized: Missing user token" });
    }

    const fileKeyBase64 = req.headers['x-file-key'] as string;
    const fileSaltBase64 = req.headers['x-file-salt'] as string;
    const fileIvBase64 = req.headers['x-file-iv'] as string;
    const metadataBase64 = req.headers['x-file-metadata'] as string;

    if (!fileKeyBase64 || !fileSaltBase64 || !fileIvBase64 || !metadataBase64) {
      return res.status(400).json({ success: false, error: "Missing required headers for raw processing" });
    }

    const fileKey = Buffer.from(fileKeyBase64, 'base64').toString('utf-8');
    const isV2 = fileSaltBase64 && fileSaltBase64.startsWith("v2_");
    const saltBuffer = isV2 ? null : Buffer.from(fileSaltBase64, 'base64');
    const fileIv = Buffer.from(fileIvBase64, 'base64');
    const metadata = JSON.parse(Buffer.from(metadataBase64, 'base64').toString('utf-8'));

    const { id } = metadata;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID format in metadata" });
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

    const rawBuffer = await getRawBody(req);
    
    // SECURITY & DATA INTEGRITY: Overwrite userId and enforce server timestamp authority
    const serverTimestamp = Date.now();
    metadata.userId = authUid;
    delete metadata.createdAt;
    delete metadata.timestamp;
    delete metadata.serverCreatedAt;
    delete metadata.serverTimestamp;
    metadata.createdAt = serverTimestamp;
    metadata.timestamp = serverTimestamp;

    const contentType = metadata.contentType || "application/octet-stream";

    let finalEncBuffer: Buffer;
    if (rawBuffer.length >= 8 && rawBuffer[0] === 0x45 && rawBuffer[1] === 0x4e && rawBuffer[2] === 0x43) { // 'ENC'
      finalEncBuffer = rawBuffer;
    } else {
      // Keep original file untransformed to preserve 100% exact pixels, metadata, and checksum
      const processedBuffer = rawBuffer;

      // 1. Derive key
      let key: Buffer;
      if (isV2) {
        // Direct SHA-256 derivation of the key, matching deriveFileKeyFast on the client
        key = crypto.createHash('sha256').update(fileKey).digest();
      } else {
        if (!saltBuffer) {
          return res.status(400).json({ success: false, error: "Missing salt for non-v2 file encryption" });
        }
        key = crypto.pbkdf2Sync(fileKey, saltBuffer, 100000, 32, 'sha256');
      }

      // 2. Encrypt with AES-256-GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', key, fileIv);
      const ciphertext = Buffer.concat([cipher.update(processedBuffer), cipher.final()]);
      const authTag = cipher.getAuthTag();
      // The Web Crypto API appends the auth tag to the end of the ciphertext
      const fullCiphertextBuffer = Buffer.concat([ciphertext, authTag]);

      // Update metadata with new sizes and types
      metadata.contentType = contentType;
      metadata.totalSize = processedBuffer.length;
      // We MUST include iv in metadata so the client knows it
      metadata.iv = fileIvBase64;

      // Pack into ENC2 format
      finalEncBuffer = packEncryptedFileServerV2(metadata, fullCiphertextBuffer);
    }

    // Save to all storage locations
    const filePath = path.join(IMAGES_DIR, `${id}.enc`);
    await fs.writeFile(filePath, finalEncBuffer);

    try {
      await uploadToR2(`images/${id}.enc`, finalEncBuffer, "application/octet-stream");
    } catch (r2Err) {}

    // Background B2 backup
    processB2Backups().catch(() => {});

    res.json({ success: true, processedSize: finalEncBuffer.length, contentType, createdAt: serverTimestamp, timestamp: serverTimestamp });
  } catch (err: any) {
    console.error('[StorageControllerUploadRaw] Error processing upload:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
