import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "./core";

export async function uploadChatMediaToR2(key: string, body: Buffer | string, contentType: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;
  const bucket = process.env.CLOUDFLARE_R2_CHAT_BUCKET_NAME || "cloud-gallery-chat";
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await client.send(command);
    console.log(`[R2Client] Chat Media Uploaded: ${key} to bucket ${bucket}`);
    return true;
  } catch (err) {
    console.error(`[R2Client] Error uploading chat media ${key} to R2:`, err);
    return false;
  }
}

export async function downloadChatMediaFromR2(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  const client = getR2Client();
  if (!client) return null;
  const bucket = process.env.CLOUDFLARE_R2_CHAT_BUCKET_NAME || "cloud-gallery-chat";
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await client.send(command);
    if (!response.Body) return null;
    
    const chunks: any[] = [];
    const stream = response.Body as any;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const contentType = response.ContentType || "application/octet-stream";
    return { data: buffer, contentType };
  } catch (err: any) {
    console.error(`[R2Client] Error downloading chat media ${key} from R2:`, err);
    return null;
  }
}
