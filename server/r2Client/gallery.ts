import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2Client } from "./core";

export async function uploadToR2(key: string, data: any, contentType: string = "application/octet-stream"): Promise<boolean> {
  const client = getR2Client();
  if (!client) {
    console.warn("[R2Client] Cannot upload, R2 client is null (missing credentials)");
    return false;
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "cloudgallery";
  const bodyData = (typeof data === "string" || Buffer.isBuffer(data) || data instanceof Uint8Array)
    ? data
    : JSON.stringify(data);

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bodyData,
      ContentType: contentType,
    });
    await client.send(command);
    console.log(`[R2Client] Uploaded successfully: ${key} to bucket ${bucket}`);
    return true;
  } catch (err) {
    console.error(`[R2Client] Error uploading ${key} to R2:`, err);
    return false;
  }
}

export async function downloadFromR2(key: string): Promise<Buffer | null> {
  const client = getR2Client();
  if (!client) return null;

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "cloudgallery";

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await client.send(command);
    if (!response.Body) {
      return null;
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (err: any) {
    if (err.name === "NoSuchKey") {
      console.log(`[R2Client] File not found in R2: ${key}`);
    } else {
      console.error(`[R2Client] Error downloading ${key} from R2:`, err);
    }
    return null;
  }
}

export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "cloudgallery";
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await client.send(command);
    console.log(`[R2Client] Deleted successfully from R2: ${key}`);
    return true;
  } catch (err) {
    console.error(`[R2Client] Error deleting ${key} from R2:`, err);
    return false;
  }
}

export async function listKeysFromR2(prefix?: string): Promise<string[]> {
  const client = getR2Client();
  if (!client) return [];
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "cloudgallery";
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    const response = await client.send(command);
    if (response.Contents) {
      return response.Contents.map(item => item.Key || "").filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error(`[R2Client] Error listing keys from R2:`, err);
    return [];
  }
}
