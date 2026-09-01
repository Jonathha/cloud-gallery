import { Response } from "express";
import fs from "node:fs/promises";
import path from "path";
import { IMAGES_DIR } from "./storageHelpers";
import { AuthenticatedRequest } from "./authMiddleware";

export async function migrateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    const authEmail = req.user?.email;
    if (!authUid) {
      return res.status(401).json({ success: false, error: "Unauthorized: Missing user token" });
    }

    const { oldUserId, newUserId } = req.body;
    if (!oldUserId || !newUserId) {
      return res.status(400).json({ success: false, error: "oldUserId and newUserId are required" });
    }

    // Security check: Only the authenticated user can migrate files into their own newUserId,
    // and oldUserId must match their email or current UID.
    if (authUid !== newUserId) {
      return res.status(403).json({ success: false, error: "Forbidden: Cannot migrate files to another user ID" });
    }
    if (oldUserId !== authUid && oldUserId !== authEmail) {
      return res.status(403).json({ success: false, error: "Forbidden: Cannot migrate files from an unverified user ID" });
    }

    const files = await fs.readdir(IMAGES_DIR);
    let count = 0;
    const migratedImageIds: string[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(IMAGES_DIR, file);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const data = JSON.parse(content);
          if (data.userId === oldUserId) {
            data.userId = newUserId;
            await fs.writeFile(filePath, JSON.stringify(data), "utf-8");
            count++;
            if (data.id) {
              migratedImageIds.push(data.id);
            }
          }
        } catch (err) {
          console.error(`[Migration] Error migrating file ${file}:`, err);
        }
      }
    }

    console.log(`[Migration] Migrated ${count} images from ${oldUserId} to ${newUserId}`);
    res.json({ success: true, migratedCount: count, migratedImageIds });
  } catch (err: any) {
    console.error("[Migration] Error in migrate-user endpoint:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
