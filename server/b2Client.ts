import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let b2ClientInstance: S3Client | null = null;

export function getB2Client() {
  if (b2ClientInstance) return b2ClientInstance;

  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_ENDPOINT } = process.env;
  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_ENDPOINT) {
    return null;
  }

  let region = "us-east-005";
  const match = B2_ENDPOINT.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/);
  if (match && match[1]) {
    region = match[1];
  }

  b2ClientInstance = new S3Client({
    endpoint: B2_ENDPOINT.startsWith("http") ? B2_ENDPOINT : `https://${B2_ENDPOINT}`,
    region,
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    }
  });

  return b2ClientInstance;
}

export async function uploadToB2(key: string, body: Buffer, contentType: string = "application/octet-stream") {
  const client = getB2Client();
  if (!client) throw new Error("B2 client not configured");

  const { B2_BUCKET } = process.env;
  if (!B2_BUCKET) throw new Error("B2_BUCKET not configured");

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
}
