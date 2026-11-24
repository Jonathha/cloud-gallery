import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { jsonResponse, corsHeaders } from "./workerHelpers.js";

export async function handleUpdateDownload(request, env) {
  const bucket = env.R2 || env.CHAT_R2;

  // 1. Try native Cloudflare R2 binding first
  if (bucket) {
    try {
      // Check common APK filenames
      const candidateKeys = ["Guarly.apk", "app-release.apk", "app.apk", "guarly.apk", "guarly-release.apk"];
      for (const key of candidateKeys) {
        const obj = await bucket.get(key);
        if (obj) {
          return new Response(obj.body, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/vnd.android.package-archive",
              "Content-Disposition": `attachment; filename="${key}"`,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }

      // If not found in candidate keys, list objects
      const list = await bucket.list();
      if (list && list.objects && list.objects.length > 0) {
        const apkObjs = list.objects.filter(item => item.key && item.key.toLowerCase().endsWith(".apk"));
        if (apkObjs.length > 0) {
          apkObjs.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
          const latestKey = apkObjs[0].key;
          const obj = await bucket.get(latestKey);
          if (obj) {
            return new Response(obj.body, {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/vnd.android.package-archive",
                "Content-Disposition": `attachment; filename="${latestKey}"`,
                "Cache-Control": "public, max-age=3600",
              },
            });
          }
        }
      }
    } catch (r2Err) {
      console.warn("[WorkerUpdate] Native R2 retrieval attempt failed:", r2Err);
    }
  }

  // 2. Fallback to S3 Client if credentials exist
  const accountId = (env.CLOUDFLARE_ACCOUNT_ID || "47ee460c72b6f01c35d72f13ebf8afbf").trim();
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();

  if (accessKeyId && secretAccessKey) {
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
      try {
        const listCommand = new ListObjectsV2Command({ Bucket: "guarly" });
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

      const getCommand = new GetObjectCommand({
        Bucket: "guarly",
        Key: selectedKey,
      });

      const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });
      return Response.redirect(signedUrl, 302);
    } catch (err) {
      console.error("Error generating signed URL:", err);
    }
  }

  // 3. Fallback redirect
  return Response.redirect("https://pub-822d342550ca446b9e7a5974089360b5.r2.dev/Guarly.apk", 302);
}

export async function handleUpdateDownloadExe(request, env) {
  const bucket = env.R2 || env.CHAT_R2;

  // 1. Try native Cloudflare R2 binding first
  if (bucket) {
    try {
      const candidateKeys = ["app.exe", "guarly.exe", "app-setup.exe"];
      for (const key of candidateKeys) {
        const obj = await bucket.get(key);
        if (obj) {
          return new Response(obj.body, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/vnd.microsoft.portable-executable",
              "Content-Disposition": `attachment; filename="${key}"`,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }

      const list = await bucket.list();
      if (list && list.objects && list.objects.length > 0) {
        const exeObjs = list.objects.filter(item => item.key && item.key.toLowerCase().endsWith(".exe"));
        if (exeObjs.length > 0) {
          exeObjs.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
          const latestKey = exeObjs[0].key;
          const obj = await bucket.get(latestKey);
          if (obj) {
            return new Response(obj.body, {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/vnd.microsoft.portable-executable",
                "Content-Disposition": `attachment; filename="${latestKey}"`,
                "Cache-Control": "public, max-age=3600",
              },
            });
          }
        }
      }
    } catch (r2Err) {
      console.warn("[WorkerUpdate] Native R2 EXE retrieval attempt failed:", r2Err);
    }
  }

  // 2. Fallback redirect
  return Response.redirect("https://47ee460c72b6f01c35d72f13ebf8afbf.r2.cloudflarestorage.com/guarly/app.exe", 302);
}

