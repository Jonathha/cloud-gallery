import { corsHeaders, jsonResponse } from "./workerHelpers.js";
import { handleSendCode, handleVerifyCode, handleMigrateUser, handleVerifyRecaptcha } from "./workerAuth.js";
import { handleListImages, handleListProtectedImages, handleUploadImage, handleUploadRawImage, handleGetImage, handleDeleteImage, handleGetThumbnail, handleUploadThumbnail } from "./workerStorage.js";
import { handleUpdateDownload } from "./workerUpdate.js";
import { handleFindShare, handleCreateShare, handleViewShare, handleDeleteShare } from "./workerShare.js";
import { handleGuarlyChatWorker } from "./workerGuarlyAi.js";
import { handleRecordLog, handleFetchLogs } from "./workerLogs.js";
import { checkWorkerAbuseProtection, recordWorkerProbeAttempt, RateLimiter } from "./workerAbuseProtection.js";
import { handleRouletteStatus, handleRouletteSpin, handleAdminRouletteUsers, handleAdminRouletteSpins, handleAdminRouletteSpinDetail, handleAdminUpdateUserSpins } from "./workerRoulette.js";

export { RateLimiter };

export default {
  async fetch(request, env, ctx) {
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
      if (abuse.captchaRequired) {
        const captchaResponse = jsonResponse({
          success: false,
          error: "Verificação de segurança necessária.",
          captchaRequired: true,
          module: abuse.module
        }, 429);
        captchaResponse.headers.set("X-Security-Captcha-Required", "true");
        return captchaResponse;
      }
      if (abuse.delayMs > 0) {
        await new Promise(r => setTimeout(r, abuse.delayMs));
      }
      
      let response;
      if (url.pathname === "/api/auth/send-code" && method === "POST") response = await handleSendCode(request, env);
      else if (url.pathname === "/api/auth/verify-code" && method === "POST") response = await handleVerifyCode(request, env);
      else if (url.pathname === "/api/auth/migrate-user" && method === "POST") response = await handleMigrateUser(request, env);
      else if (url.pathname === "/api/verify-recaptcha" && method === "POST") response = await handleVerifyRecaptcha(request, env);
      else if (url.pathname === "/api/guarly/chat" && method === "POST") response = await handleGuarlyChatWorker(request, env);
      else if (url.pathname === "/api/update/download" && method === "GET") response = await handleUpdateDownload(request, env);
      else if (url.pathname.startsWith("/api/chat/")) response = jsonResponse({ error: "Esta página não existe ou não está disponível." }, 404);
      else if (url.pathname === "/api/storage/images" && method === "GET") response = await handleListImages(request, env);
      else if (url.pathname === "/api/storage/protected-images" && method === "GET") response = await handleListProtectedImages(request, env);
      else if (url.pathname === "/api/storage/upload" && method === "POST") response = await handleUploadImage(request, env);
      else if (url.pathname === "/api/storage/upload-raw" && method === "POST") response = await handleUploadRawImage(request, env);
      else if (url.pathname.startsWith("/api/storage/image/") && method === "GET") response = await handleGetImage(request, env);
      else if (url.pathname.startsWith("/api/storage/image/") && method === "DELETE") response = await handleDeleteImage(request, env);
      else if (url.pathname.startsWith("/api/storage/thumbnail/") && method === "GET") response = await handleGetThumbnail(request, env);
      else if (url.pathname.startsWith("/api/storage/thumbnail/") && method === "POST") response = await handleUploadThumbnail(request, env);
      else if (url.pathname.startsWith("/api/share/image/") && method === "GET") response = await handleFindShare(request, env);
      else if (url.pathname === "/api/share/create" && method === "POST") response = await handleCreateShare(request, env);
      else if (url.pathname === "/api/logs/record" && method === "POST") response = await handleRecordLog(request, env);
      else if (url.pathname === "/api/logs/list" && method === "GET") response = await handleFetchLogs(request, env);
      else if (url.pathname === "/api/roulette/status" && method === "GET") response = await handleRouletteStatus(request, env);
      else if (url.pathname === "/api/roulette/spin" && method === "POST") response = await handleRouletteSpin(request, env);
      else if (url.pathname === "/api/admin/roulette/users" && method === "GET") response = await handleAdminRouletteUsers(request, env);
      else if (url.pathname === "/api/admin/roulette/update-spins" && method === "POST") response = await handleAdminUpdateUserSpins(request, env);
      else if (url.pathname === "/api/admin/roulette/spins" && method === "GET") response = await handleAdminRouletteSpins(request, env);
      else if (url.pathname.startsWith("/api/admin/roulette/spins/") && method === "GET") {
        const spinId = url.pathname.replace("/api/admin/roulette/spins/", "");
        response = await handleAdminRouletteSpinDetail(request, env, spinId);
      }
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
  }
};
