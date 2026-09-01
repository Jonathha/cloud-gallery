import { S3Client } from "@aws-sdk/client-s3";

let r2ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (r2ClientInstance) return r2ClientInstance;

  let rawEndpoint = (process.env.CLOUDFLARE_R2_ENDPOINT || "").trim();
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "47ee460c72b6f01c35d72f13ebf8afbf").trim();

  if (!rawEndpoint && accountId) {
    rawEndpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  }

  if (!rawEndpoint) {
    console.warn("[R2Client] Cannot initialize: No R2 endpoint or account ID available.");
    return null;
  }

  // Ensure endpoint is strictly origin without bucket path duplication (e.g., strip /cloudgallery if present)
  let endpoint = rawEndpoint;
  try {
    const formattedUrl = rawEndpoint.startsWith("http") ? rawEndpoint : `https://${rawEndpoint}`;
    const urlObj = new URL(formattedUrl);
    endpoint = `${urlObj.protocol}//${urlObj.host}`;
  } catch (err) {
    endpoint = rawEndpoint.replace(/\/+$/, "").split("/cloudgallery")[0];
  }

  const accessKeyId = (
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_API_TOKEN ||
    ""
  ).trim();

  const secretAccessKey = (
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_API_TOKEN ||
    ""
  ).trim();

  if (!accessKeyId || !secretAccessKey) {
    console.warn("[R2Client] Cannot initialize: Missing accessKeyId or secretAccessKey credentials.");
    return null;
  }

  if (accessKeyId.length < 8) {
    console.warn(`[R2Client] Warning: Access Key ID seems unusually short.`);
  }

  try {
    r2ClientInstance = new S3Client({
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: "auto",
      forcePathStyle: true,
    });
    console.log("[R2Client] S3Client initialized successfully for Cloudflare R2 endpoint:", endpoint);
    return r2ClientInstance;
  } catch (err) {
    console.error("[R2Client] Error initializing S3Client for R2:", err);
    return null;
  }
}

