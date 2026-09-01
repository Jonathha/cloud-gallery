import fs from "node:fs/promises";
import path from "path";
import { uploadToB2 } from "./b2Client";
import { IMAGES_DIR } from "./storageHelpers";

const B2_SYNC_STATE_FILE = path.join(process.cwd(), 'b2_synced.json');
let isSyncing = false;

async function getSyncedFiles(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(B2_SYNC_STATE_FILE, 'utf-8');
    const list = JSON.parse(data);
    return new Set(list);
  } catch {
    return new Set();
  }
}

async function saveSyncedFiles(synced: Set<string>) {
  try {
    await fs.writeFile(B2_SYNC_STATE_FILE, JSON.stringify(Array.from(synced)), 'utf-8');
  } catch (err) {
    console.error('[B2BackupService] Failed to save sync state:', err);
  }
}

export async function processB2Backups() {
  if (isSyncing) return;
  if (!process.env.B2_KEY_ID) return;
  
  isSyncing = true;
  try {
    const synced = await getSyncedFiles();
    let keys: string[] = [];
    
    try {
      const { listKeysFromR2 } = await import("./r2Client");
      keys = await listKeysFromR2("images/");
    } catch (err) {
      console.error("[B2BackupService] Failed to list keys from R2:", err);
      return;
    }
    
    let stateChanged = false;
    
    for (const key of keys) {
      if (!key.endsWith('.enc')) continue;
      
      const fileName = key.replace("images/", "");
      
      if (synced.has(fileName)) continue;
      
      try {
        console.log(`[B2BackupService] Downloading ${key} from R2 to upload to B2...`);
        const { downloadFromR2 } = await import("./r2Client");
        const buffer = await downloadFromR2(key);
        
        if (!buffer) {
           console.error(`[B2BackupService] Failed to download ${key} from R2 (returned null).`);
           continue;
        }
        
        console.log(`[B2BackupService] Uploading ${fileName} to B2...`);
        // Upload to B2 (folder structure maintained as 'images/')
        await uploadToB2(`images/${fileName}`, buffer, "application/octet-stream");
        
        synced.add(fileName);
        stateChanged = true;
        console.log(`[B2BackupService] Successfully backed up ${fileName} to B2.`);
      } catch (uploadErr) {
        console.error(`[B2BackupService] Failed to upload ${fileName} to B2. Will retry later.`, uploadErr);
      }
    }
    
    if (stateChanged) {
      await saveSyncedFiles(synced);
    }
  } catch (err) {
    console.error('[B2BackupService] Error processing backups:', err);
  } finally {
    isSyncing = false;
  }
}

export function startB2BackupService() {
  if (!process.env.B2_KEY_ID) {
    console.log('[B2BackupService] B2 credentials not found. Backup service disabled.');
    return;
  }
  
  console.log('[B2BackupService] Starting B2 backup service...');
  
  // Run immediately on start
  processB2Backups().catch(err => console.error(err));
  
  // Retry pending backups periodically (every 5 minutes)
  setInterval(() => {
    processB2Backups().catch(err => console.error(err));
  }, 5 * 60 * 1000);
}
