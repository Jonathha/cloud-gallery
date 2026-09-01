import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { jsonResponse } from "./workerHelpers.js";

export async function handleUpdateDownload(request, env) {
  const accountId = (env.CLOUDFLARE_ACCOUNT_ID || "47ee460c72b6f01c35d72f13ebf8afbf").trim();
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = "guarly";

  if (!accessKeyId || !secretAccessKey) {
    return jsonResponse({ error: "R2 credentials not configured on the worker." }, 500);
  }
  
  if (accessKeyId.length !== 32) {
    return jsonResponse({ error: `Invalid R2 Access Key ID length: ${accessKeyId.length}. Cloudflare R2 Access Keys must be exactly 32 characters long. You might have used a Cloudflare API token instead.` }, 500);
  }

  try {
    const s3 = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: "auto",
      forcePathStyle: true,
    });

    let selectedKey = "app-release.apk";

    // 1. List objects to find the right APK file
    const listCommand = new ListObjectsV2Command({ Bucket: bucket });
    
    try {
      const response = await s3.send(listCommand);
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
          selectedKey = apkObjects[0].Key;
        }
      }
    } catch (listErr) {
      console.warn("Failed to list objects, falling back to default key", listErr);
    }

    // 2. Generate a pre-signed URL valid for 5 minutes (300 seconds)
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: selectedKey,
    });

    const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });
    
    // Redirect the user
    return Response.redirect(signedUrl, 302);
  } catch (err) {
    console.error("Error generating signed URL:", err);
    return jsonResponse({ error: "Failed to generate download link" }, 500);
  }
}
