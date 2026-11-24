import { Request, Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { getDB } from "./firebaseAdmin";
import { uploadToR2 } from "./r2Client";
import { SHARES_DIR, checkImageExists, getClientIp } from "./shareHelpers";
import { loadShareData, handleOrphanOrExpiredShare } from "./shareLoadHelpers";

interface RateLimitRecord {
  attempts: number;
  resetTime: number;
}

const shareRateLimitMap = new Map<string, RateLimitRecord>();
// shareId -> (clientIp -> last access timestamp) inside the high-demand window
const shareAccessTimestamps = new Map<string, Map<string, number>>();

const HIGH_DEMAND_WINDOW_MS = 120000;
const HIGH_DEMAND_MAX_VIEWERS = 3;
const MAX_TRACKED_KEYS = 20000;

function capMap(map: Map<string, unknown>) {
  while (map.size > MAX_TRACKED_KEYS) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

// Drops expired entries so random/nonexistent share IDs cannot grow the maps forever.
function sweepShareTrackers() {
  const now = Date.now();
  for (const [key, rec] of shareRateLimitMap) {
    if (now > rec.resetTime) shareRateLimitMap.delete(key);
  }
  for (const [shareId, viewers] of shareAccessTimestamps) {
    for (const [ip, t] of viewers) {
      if (t <= now - HIGH_DEMAND_WINDOW_MS) viewers.delete(ip);
    }
    if (viewers.size === 0) shareAccessTimestamps.delete(shareId);
  }
}
const sweepTimer: any = setInterval(sweepShareTrackers, 60000);
sweepTimer.unref?.();

// High demand = more than HIGH_DEMAND_MAX_VIEWERS *different* clients on the same share inside the window.
// Clients already admitted (e.g. the recipient hitting refresh) are never blocked by other people's traffic.
function checkHighDemand(shareId: string, clientIp: string): boolean {
  const now = Date.now();
  let viewers = shareAccessTimestamps.get(shareId);
  if (!viewers) {
    viewers = new Map();
    shareAccessTimestamps.set(shareId, viewers);
    capMap(shareAccessTimestamps);
  }
  for (const [ip, t] of viewers) {
    if (t <= now - HIGH_DEMAND_WINDOW_MS) viewers.delete(ip);
  }
  if (!viewers.has(clientIp) && viewers.size >= HIGH_DEMAND_MAX_VIEWERS) return true;
  viewers.set(clientIp, now);
  return false;
}

function checkShareRateLimit(key: string, limit: number = 10, windowMs: number = 60000): boolean {

  const now = Date.now();
  const record = shareRateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    shareRateLimitMap.set(key, { attempts: 1, resetTime: now + windowMs });
    capMap(shareRateLimitMap);
    return false; // Not limited
  }
  record.attempts += 1;
  if (record.attempts > limit) {
    return true; // Rate limited
  }
  return false;
}

export async function viewShare(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const clientIp = getClientIp(req);

    // Rate limiting / Brute force protection per shareId and IP
    const rateLimitKey = `${clientIp}_${shareId}`;
    if (checkShareRateLimit(rateLimitKey, 8, 60000)) {
      return res.status(429).json({ success: false, error: 'Muitas tentativas de acesso. Por favor, aguarde um minuto e tente novamente.' });
    }

    if (checkHighDemand(shareId, clientIp)) {
      return res.status(429).json({ success: false, highDemand: true, error: 'Este compartilhamento está com alta demanda.' });
    }

    const filePath = path.join(SHARES_DIR, `${shareId}.json`);

    
    const db = getDB();

    const shareData = await loadShareData(shareId, filePath, null, db);

    if (!shareData) {
      return res.status(404).json({ success: false, error: 'Link de compartilhamento inválido ou expirado.' });
    }

    const imageExists = await checkImageExists(shareData.imageId);
    if (!imageExists) {
      console.log(`[ShareService] Parent image ${shareData.imageId} not found. Purging orphan share ${shareId}.`);
      await handleOrphanOrExpiredShare(shareId, filePath, null, db);
      return res.status(404).json({ success: false, error: 'Link de compartilhamento inválido ou expirado.' });
    }

    const now = Date.now();
    if (shareData.options?.expiresAt && now > shareData.options.expiresAt) {
      await handleOrphanOrExpiredShare(shareId, filePath, null, db);
      return res.status(410).json({ success: false, error: 'Este link de compartilhamento expirou (limite de 1 hora).' });
    }

    if (shareData.options?.oneTimeView) {
      if (!shareData.firstViewedAt) {
        if (db) {
          try {
            await db.runTransaction(async (t: any) => {
              const docRef = db.collection('shares').doc(shareId);
              const doc = await t.get(docRef);
              if (!doc.exists) throw new Error("Share not found");
              const data = doc.data();
              if (data.firstViewedAt) throw new Error("Already viewed");
              t.update(docRef, { firstViewedAt: now, firstViewerIp: clientIp });
            });
            
            // Transaction succeeded
            shareData.firstViewedAt = now;
            shareData.firstViewerIp = clientIp;
          } catch (e: any) {
            if (e.message === "Already viewed" || e.message === "Share not found") {
              return res.status(403).json({ success: false, error: 'Esta visualização única expirou. O limite de 1 minuto foi atingido e o arquivo foi excluído permanentemente.' });
            }
            throw e;
          }
        } else {
          // Fallback if db is somehow not defined, though it's now required
          shareData.firstViewedAt = now;
          shareData.firstViewerIp = clientIp;
        }

        try { await fs.writeFile(filePath, JSON.stringify(shareData), 'utf-8'); } catch(e){}
        try { await uploadToR2(`shares/${shareId}.json`, shareData); } catch (e) {}
      } else {
        if ((now - shareData.firstViewedAt) / 1000 > 60) {
          await handleOrphanOrExpiredShare(shareId, filePath, null, db);
          return res.status(403).json({ success: false, error: 'Esta visualização única expirou. O limite de 1 minuto foi atingido e o arquivo foi excluído permanentemente.' });
        }
        if (shareData.firstViewerIp && shareData.firstViewerIp !== clientIp) {
          return res.status(403).json({ success: false, error: 'Acesso bloqueado: Este link de visualização única está travado no dispositivo inicial.' });
        }
      }
    }

    return res.json({
      success: true,
      share: {
        id: shareData.id || shareId,
        imageId: shareData.imageId,
        userId: shareData.userId,
        ciphertext: shareData.ciphertext,
        iv: shareData.iv,
        isChunked: shareData.isChunked || false,
        chunkCount: shareData.chunkCount || 1,
        contentType: shareData.contentType || 'image/png',
        totalSize: shareData.totalSize || 0,
        options: {
          requirePassword: shareData.options?.requirePassword,
          encryptedShareKey: shareData.options?.encryptedShareKey,
          ivShareKey: shareData.options?.ivShareKey,
          allowDownload: shareData.options?.allowDownload,
          oneTimeView: shareData.options?.oneTimeView,
          expiresAt: shareData.options?.expiresAt
        },
        firstViewedAt: shareData.firstViewedAt,
        clientIp
      }
    });
  } catch (err: any) {
    console.error('[ShareService] Error holding view share:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
