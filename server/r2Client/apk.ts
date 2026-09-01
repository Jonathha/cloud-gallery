import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "./core";

export async function getApkDownloadUrl(): Promise<{ url: string; key: string } | null> {
  const client = getR2Client();
  if (!client) {
    console.error("[R2Client] R2 client is not configured.");
    return null;
  }
  const bucket = "guarly"; 
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
    });
    
    const response = await client.send(listCommand);
    let selectedKey = "app-release.apk"; 
    
    if (response.Contents && response.Contents.length > 0) {
      const apkObjects = response.Contents.filter(item => 
        item.Key && item.Key.toLowerCase().endsWith(".apk")
      );
      if (apkObjects.length > 0) {
        apkObjects.sort((a, b) => {
          const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
          const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
          return dateB - dateA;
        });
        selectedKey = apkObjects[0].Key || "app-release.apk";
        console.log(`[R2Client] Found APK files in bucket "${bucket}". Selected latest: "${selectedKey}"`);
      } else {
        console.log(`[R2Client] No APK files found in bucket "${bucket}". Falling back to: "${selectedKey}"`);
      }
    } else {
      console.log(`[R2Client] Bucket "${bucket}" is empty or list failed. Falling back to: "${selectedKey}"`);
    }

    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: selectedKey,
    });
    const signedUrl = await getSignedUrl(client as any, getCommand, { expiresIn: 300 });
    
    return {
      url: signedUrl,
      key: selectedKey,
    };
  } catch (err: any) {
    console.error("[R2Client] Error generating pre-signed APK URL:", err);
    try {
      const fallbackKey = "app-release.apk";
      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: fallbackKey,
      });
      const signedUrl = await getSignedUrl(client as any, getCommand, { expiresIn: 300 });
      return {
        url: signedUrl,
        key: fallbackKey,
      };
    } catch (fallbackErr) {
      console.error("[R2Client] Fallback presign also failed:", fallbackErr);
      return null;
    }
  }
}

export async function getExeDownloadUrl(): Promise<{ url: string; key: string } | null> {
  const client = getR2Client();
  if (!client) {
    console.error("[R2Client] R2 client is not configured.");
    return null;
  }
  const bucket = "guarly"; 
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
    });
    
    const response = await client.send(listCommand);
    let selectedKey = "app.exe"; 
    
    if (response.Contents && response.Contents.length > 0) {
      const exeObjects = response.Contents.filter(item => 
        item.Key && item.Key.toLowerCase().endsWith(".exe")
      );
      if (exeObjects.length > 0) {
        exeObjects.sort((a, b) => {
          const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
          const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
          return dateB - dateA;
        });
        selectedKey = exeObjects[0].Key || "app.exe";
        console.log(`[R2Client] Found EXE files in bucket "${bucket}". Selected latest: "${selectedKey}"`);
      } else {
        console.log(`[R2Client] No EXE files found in bucket "${bucket}". Falling back to: "${selectedKey}"`);
      }
    } else {
      console.log(`[R2Client] Bucket "${bucket}" is empty or list failed. Falling back to: "${selectedKey}"`);
    }

    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: selectedKey,
    });
    const signedUrl = await getSignedUrl(client as any, getCommand, { expiresIn: 300 });
    
    return {
      url: signedUrl,
      key: selectedKey,
    };
  } catch (err: any) {
    console.error("[R2Client] Error generating pre-signed EXE URL:", err);
    try {
      const fallbackKey = "app.exe";
      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: fallbackKey,
      });
      const signedUrl = await getSignedUrl(client as any, getCommand, { expiresIn: 300 });
      return {
        url: signedUrl,
        key: fallbackKey,
      };
    } catch (fallbackErr) {
      console.error("[R2Client] Fallback presign also failed:", fallbackErr);
      return null;
    }
  }
}

export async function getLatestApkKey(): Promise<string> {
  const client = getR2Client();
  if (!client) return "app-release.apk";
  const bucket = "guarly";
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
    });
    const response = await client.send(listCommand);
    if (response.Contents && response.Contents.length > 0) {
      const apkObjects = response.Contents.filter(item => 
        item.Key && item.Key.toLowerCase().endsWith(".apk")
      );
      if (apkObjects.length > 0) {
        apkObjects.sort((a, b) => {
          const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
          const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
          return dateB - dateA;
        });
        return apkObjects[0].Key || "app-release.apk";
      }
    }
  } catch (err) {
    console.error("[R2Client] Error finding latest APK key:", err);
  }
  return "app-release.apk";
}

export async function getApkStream(key: string): Promise<{ stream: any; contentType: string; contentLength?: number } | null> {
  const client = getR2Client();
  if (!client) return null;
  const bucket = "guarly";
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await client.send(command);
    if (!response.Body) return null;
    return {
      stream: response.Body,
      contentType: response.ContentType || "application/vnd.android.package-archive",
      contentLength: response.ContentLength,
    };
  } catch (err) {
    console.error(`[R2Client] Error getting stream for APK key ${key}:`, err);
    return null;
  }
}
