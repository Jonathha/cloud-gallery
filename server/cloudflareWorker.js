import { setUserSyncNamespace } from "./userSync.js";
import { corsHeaders, jsonResponse } from "./workerHelpers.js";
import { handleSendCode, handleVerifyCode, handleMigrateUser, handleVerifyRecaptcha } from "./workerAuth.js";
import { handleListImages, handleListProtectedImages, handleUserVersion, handleUploadImage, handleUploadRawImage, handleGetImage, handleDeleteImage, handleGetThumbnail, handleUploadThumbnail } from "./workerStorage.js";
import { handleUpdateDownload, handleUpdateDownloadExe } from "./workerUpdate.js";
import { handleFindShare, handleListMyShares, handleCreateShare, handleViewShare, handleDeleteShare } from "./workerShare.js";
import { handleGuarlyChatWorker } from "./workerGuarlyAi.js";
import { handleRecordLog } from "./workerLogs.js";
import { checkWorkerAbuseProtection, recordWorkerProbeAttempt, RateLimiter } from "./workerAbuseProtection.js";
import {
  handleGetVaultConfig,
  handleSaveVaultSetup,
  handleRecordVaultPenalty,
  handleResetVaultPenalty,
  handleUpdateVaultSettings,
  handleGetMediaKey,
  handleSaveMediaKey,
  handleDeleteMediaKey,
  handleGetAppConfig,
  handleSetAppConfig,
  handleRegisterDeviceToken,
  handleOpaqueRegisterInit,
  handleOpaqueRegisterFinish,
  handleOpaqueLoginInit,
  handleOpaqueLoginFinish
} from "./workerVault.js";

export { RateLimiter };
export { UserSync } from "./userSync.js";

export default {
  async fetch(request, env, ctx) {
    setUserSyncNamespace(env.USER_SYNC);
    const url = new URL(request.url);
    const method = request.method;
    
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      if (url.pathname === "/api/ip") {
        const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
        return jsonResponse({ ip });
      }
      
      if (url.pathname === "/api/health") {
        return jsonResponse({ status: "ok" });
      }

      if (url.pathname === "/api/version" && method === "GET") {
        return jsonResponse({
          success: true,
          version: "2.0",
          buildTimestamp: 1724976000000,
          minVersion: "2.0"
        });
      }

      // Check abuse protection & rate limits
      const abuse = await checkWorkerAbuseProtection(request, env, ctx);
      if (abuse.blocked) {
        return abuse.response;
      }
      if (abuse.delayMs > 0) {
        await new Promise(r => setTimeout(r, abuse.delayMs));
      }
      if (abuse.captchaRequired) {
        const captchaResponse = jsonResponse({
          success: false,
          error: "Verificação de segurança necessária.",
          captchaRequired: true,
          module: abuse.module,
          isTorOrVpn: abuse.isTorOrVpn || false
        }, 429);
        captchaResponse.headers.set("X-Security-Captcha-Required", "true");
        return captchaResponse;
      }
      
      if (url.pathname.startsWith("/api/chat/") && url.pathname !== "/api/chat/version") {
        const { runAutoChatMediaMaintenance } = await import("./chatGlobalD1.js");
        runAutoChatMediaMaintenance(env, ctx).catch(() => {});
      }

      let response;
      if (url.pathname === "/api/auth/send-code" && method === "POST") response = await handleSendCode(request, env);
      else if (url.pathname === "/api/auth/verify-code" && method === "POST") response = await handleVerifyCode(request, env);
      else if (url.pathname === "/api/auth/migrate-user" && method === "POST") response = await handleMigrateUser(request, env);
      else if (url.pathname === "/api/verify-recaptcha" && (method === "POST" || method === "GET")) response = await handleVerifyRecaptcha(request, env);
      else if (url.pathname === "/api/guarly/chat" && method === "POST") response = await handleGuarlyChatWorker(request, env);
      else if (url.pathname === "/api/update/download" && method === "GET") response = await handleUpdateDownload(request, env);
      else if (url.pathname === "/api/update/download-exe" && method === "GET") response = await handleUpdateDownloadExe(request, env);
      else if (url.pathname === "/api/chat/auth" && method === "POST") {
        const { handleChatAuth } = await import("./workerChat.js");
        response = await handleChatAuth(request, env);
      }
      else if (url.pathname === "/api/chat/profile" && (method === "GET" || method === "POST")) {
        const { handleChatProfile } = await import("./workerChatGlobal.js");
        response = await handleChatProfile(request, env);
      }
      else if (url.pathname === "/api/chat/messages" && (method === "GET" || method === "POST")) {
        const { handleChatMessages } = await import("./workerChatGlobal.js");
        response = await handleChatMessages(request, env, ctx);
      }
      else if (url.pathname === "/api/chat/version" && method === "GET") {
        const { handleChatVersion } = await import("./workerChatGlobal.js");
        response = await handleChatVersion(request, env, ctx);
      }
      else if (url.pathname === "/api/chat/push/vapid-key" && method === "GET") {
        const { handleChatVapidKey } = await import("./workerChatGlobal.js");
        response = await handleChatVapidKey(request, env);
      }
      else if (url.pathname === "/api/chat/push/subscribe" && method === "POST") {
        const { handleChatPushSubscribe } = await import("./workerChatGlobal.js");
        response = await handleChatPushSubscribe(request, env);
      }
      else if (url.pathname === "/api/chat/push/unsubscribe" && method === "POST") {
        const { handleChatPushUnsubscribe } = await import("./workerChatGlobal.js");
        response = await handleChatPushUnsubscribe(request, env);
      }
      else if (url.pathname === "/api/chat/delete-message" && method === "POST") {
        const { handleChatDeleteD1 } = await import("./workerChatGlobal.js");
        response = await handleChatDeleteD1(request, env);
      }
      else if (url.pathname === "/api/chat/delete-messages" && method === "POST") {
        const { handleChatDeleteBatchD1 } = await import("./workerChatGlobal.js");
        response = await handleChatDeleteBatchD1(request, env);
      }
      else if (url.pathname === "/api/chat/media/upload" && method === "POST") {
        const { handleChatMediaUpload } = await import("./workerChatMediaUpload.js");
        response = await handleChatMediaUpload(request, env);
      }
      else if (url.pathname.startsWith("/api/chat/media/") && method === "GET") {
        const { handleChatMediaGet } = await import("./workerChatMediaGet.js");
        response = await handleChatMediaGet(request, env);
      }
      else if (url.pathname === "/api/chat/status" && method === "GET") {
        const { handleChatStatus } = await import("./workerChatGlobal.js");
        response = await handleChatStatus(request, env);
      }
      else if (url.pathname.startsWith("/api/chat/")) response = jsonResponse({ error: "Esta página não existe ou não está disponível." }, 404);
      else if (url.pathname === "/api/storage/images" && method === "GET") response = await handleListImages(request, env);
      else if (url.pathname === "/api/storage/version" && method === "GET") response = await handleUserVersion(request, env);
      else if (url.pathname === "/api/storage/protected-images" && method === "GET") response = await handleListProtectedImages(request, env);
      else if (url.pathname === "/api/storage/upload" && method === "POST") response = await handleUploadImage(request, env);
      else if (url.pathname === "/api/storage/upload-raw" && method === "POST") response = await handleUploadRawImage(request, env);
      else if (url.pathname.startsWith("/api/storage/image/") && method === "GET") response = await handleGetImage(request, env);
      else if (url.pathname.startsWith("/api/storage/image/") && method === "DELETE") response = await handleDeleteImage(request, env);
      else if (url.pathname.startsWith("/api/storage/thumbnail/") && method === "GET") response = await handleGetThumbnail(request, env);
      else if (url.pathname.startsWith("/api/storage/thumbnail/") && method === "POST") response = await handleUploadThumbnail(request, env);
      else if (url.pathname.startsWith("/api/share/image/") && method === "GET") response = await handleFindShare(request, env);
      else if (url.pathname === "/api/share/mine" && method === "GET") response = await handleListMyShares(request, env);
      else if (url.pathname === "/api/share/create" && method === "POST") response = await handleCreateShare(request, env);
      else if (url.pathname === "/api/vault/config" && method === "GET") response = await handleGetVaultConfig(request, env);
      else if (url.pathname === "/api/vault/setup" && method === "POST") response = await handleSaveVaultSetup(request, env);
      else if (url.pathname === "/api/vault/opaque/register-init" && method === "POST") response = await handleOpaqueRegisterInit(request, env);
      else if (url.pathname === "/api/vault/opaque/register-finish" && method === "POST") response = await handleOpaqueRegisterFinish(request, env);
      else if (url.pathname === "/api/vault/opaque/login-init" && method === "POST") response = await handleOpaqueLoginInit(request, env);
      else if (url.pathname === "/api/vault/opaque/login-finish" && method === "POST") response = await handleOpaqueLoginFinish(request, env);
      else if (url.pathname === "/api/vault/penalty" && method === "POST") response = await handleRecordVaultPenalty(request, env);
      else if (url.pathname === "/api/vault/reset-penalty" && method === "POST") response = await handleResetVaultPenalty(request, env);
      else if (url.pathname === "/api/vault/settings" && method === "POST") response = await handleUpdateVaultSettings(request, env);
      else if (url.pathname.startsWith("/api/vault/media-key/") && method === "GET") {
        const imageId = url.pathname.replace("/api/vault/media-key/", "");
        response = await handleGetMediaKey(request, env, imageId);
      }
      else if (url.pathname === "/api/vault/media-key" && method === "POST") response = await handleSaveMediaKey(request, env);
      else if (url.pathname.startsWith("/api/vault/media-key/") && method === "DELETE") {
        const imageId = url.pathname.replace("/api/vault/media-key/", "");
        response = await handleDeleteMediaKey(request, env, imageId);
      }
      else if (url.pathname === "/api/config/app" && method === "GET") response = await handleGetAppConfig(request, env);
      else if (url.pathname === "/api/config/app" && method === "POST") response = await handleSetAppConfig(request, env);
      else if (url.pathname === "/api/user/devices" && method === "POST") response = await handleRegisterDeviceToken(request, env);
      else if (url.pathname === "/api/logs/record" && method === "POST") response = await handleRecordLog(request, env);
      else if (url.pathname.startsWith("/api/share/view/") && method === "GET") response = await handleViewShare(url, env, request);
      else if (url.pathname.startsWith("/api/share/") && method === "DELETE") response = await handleDeleteShare(request, env);
      else if (!url.pathname.startsWith("/api/")) {
        return env.ASSETS.fetch(request);
      } else {
        await recordWorkerProbeAttempt(request, env, "Non-existent worker endpoint probe", ctx);
        response = jsonResponse({ error: "Esta página não existe ou não está disponível." }, 404);
      }

      return response;
    } catch (err) {
      console.error("[SECURITY_AUDIT] [WORKER_INTERNAL_ERROR]", err);
      return jsonResponse({ success: false, error: "Erro no servidor." }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    setUserSyncNamespace(env.USER_SYNC);
    const { processPendingMediaCleanups, reconcileAbandonedAudioUploads } = await import("./chatGlobalD1.js");
    const tasks = [
      processPendingMediaCleanups(env).catch(err => console.error("[Scheduled] Media cleanup retry error:", err)),
      reconcileAbandonedAudioUploads(env).catch(err => console.error("[Scheduled] Abandoned uploads reconcile error:", err))
    ];
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(Promise.all(tasks));
    } else {
      await Promise.all(tasks);
    }
  }
};
