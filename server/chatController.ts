import express, { Request, Response } from "express";
import crypto from "crypto";
import { uploadChatMediaToR2, downloadChatMediaFromR2 } from "./r2Client";

const router = express.Router();
const MASTER_KEY = "PUSWPUPURIM##";

// Derive 32-byte key for AES-256
const getCryptoKey = (): Buffer => {
  const hash = crypto.createHash("sha256");
  hash.update(MASTER_KEY);
  return hash.digest();
};

// Encrypt buffer using AES-256-CBC with prepended 16-byte random IV
function encryptBuffer(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getCryptoKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

// Decrypt buffer using AES-256-CBC with prepended 16-byte random IV
function decryptBuffer(buffer: Buffer): Buffer {
  try {
    if (buffer.length < 16) return buffer;
    const iv = buffer.subarray(0, 16);
    const encrypted = buffer.subarray(16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", getCryptoKey(), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (err) {
    console.warn("[DecryptBuffer] Error decrypting buffer, returning original raw buffer:", err);
    return buffer;
  }
}

/**
 * Endpoint to upload chat files (photos, audios) directly to the Cloudflare R2 bucket.
 * Receives JSON with base64 encoded data to avoid multipart form parser dependencies.
 */
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const { fileBase64, fileName, contentType, duration } = req.body;

    if (!fileBase64 || !fileName || !contentType) {
      return res.status(400).json({ success: false, error: "Missing required chat file parameters" });
    }

    // Extract base64 part if it contains data URL prefix
    let base64Data = fileBase64;
    if (fileBase64.includes(";base64,")) {
      base64Data = fileBase64.split(";base64,")[1];
    }

    const rawBuffer = Buffer.from(base64Data, "base64");

    // Strict validation: reject empty/0-byte payloads
    if (!rawBuffer || rawBuffer.length < 50) {
      return res.status(400).json({ 
        success: false, 
        error: "Arquivo inválido ou sem conteúdo (0 bytes)." 
      });
    }

    // Strict audio validation (min 1 second, max 20 minutes)
    const isAudio = fileName.toLowerCase().includes("audio") || contentType.toLowerCase().includes("audio");
    if (isAudio) {
      if (rawBuffer.length < 300) {
        return res.status(400).json({ 
          success: false, 
          error: "O áudio enviado é muito curto ou está vazio (0 segundos)." 
        });
      }

      if (duration !== undefined && duration !== null) {
        const parsedDuration = Number(duration);
        if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 1200) {
          return res.status(400).json({ 
            success: false, 
            error: "A duração do áudio deve ser de no mínimo 1 segundo e no máximo 20 minutos." 
          });
        }
      }
    }
    
    // Encrypt the chat file buffer securely at rest using the master key PUSWPUPURIM##
    const encryptedBuffer = encryptBuffer(rawBuffer);

    const success = await uploadChatMediaToR2(fileName, encryptedBuffer, contentType);

    if (success) {
      return res.json({
        success: true,
        url: `/api/chat/media/${fileName}`
      });
    } else {
      return res.status(500).json({ success: false, error: "Failed to upload file to Cloudflare R2" });
    }
  } catch (err: any) {
    console.error("[ChatController] Error uploading file:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

/**
 * Secure proxy endpoint to retrieve chat files (photos, audios) from Cloudflare R2.
 */
router.get("/media/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    if (!key) {
      return res.status(400).send("Key is required");
    }

    const result = await downloadChatMediaFromR2(key);

    if (!result) {
      return res.status(404).send("Chat media not found in Cloudflare R2");
    }

    // Decrypt the chat file buffer on the fly using the master key PUSWPUPURIM##
    const decryptedData = decryptBuffer(result.data);

    // Set cache headers to avoid reloading frequently
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", result.contentType);
    return res.send(decryptedData);
  } catch (err: any) {
    console.error(`[ChatController] Error proxying chat file ${req.params.key}:`, err);
    return res.status(500).send("Internal server error proxying chat media");
  }
});

export default router;
