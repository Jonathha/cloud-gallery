import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import http from "http";
import { initFirebase } from "./server/firebaseAdmin";
import { startB2BackupService } from "./server/b2BackupService";
import { startChatPushNotifier } from "./server/chatPushNotifier";
import storageRouter from "./server/storageController";
import shareRouter from "./server/shareRouter";
import { setupZeroThreat } from "./server/zeroThreatMiddleware";
import { sendCode, verifyCode } from "./server/verificationController";
import { migrateUser } from "./server/migrationController";
import { requireAuth } from "./server/authMiddleware";
import { getApkDownloadUrl, getLatestApkKey, getApkStream, getExeDownloadUrl } from "./server/r2Client";

import { verifyRecaptcha } from "./server/recaptchaController";
import { handleGuarlyChat } from "./server/guarlyAiController";
import { handleRecordLogExpress, handleFetchLogsExpress } from "./server/logsController";
import { abuseProtectionMiddleware, recordProbeAttempt } from "./server/abuseProtectionMiddleware";
import { 
  handleRouletteStatusExpress, 
  handleRouletteSpinExpress, 
  handleAdminRouletteUsersExpress, 
  handleAdminRouletteSpinsExpress, 
  handleAdminRouletteSpinDetailExpress,
  handleAdminUpdateUserSpinsExpress
} from "./server/rouletteController";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Intercept zeroThreat validation requests at the absolute top of the server stack
  setupZeroThreat(app);

  // Initialize Firebase Admin
  await initFirebase();
  startB2BackupService();

  // Middleware for JSON requests with 100MB body size limit
  app.use(express.json({ limit: '100mb' }));

  // Apply intelligent Abuse Protection & Rate Limiting to all requests
  app.use(abuseProtectionMiddleware);

  // Helper to retrieve client IP safely
  app.get('/api/ip', (req, res) => {
    let clientIp = '0.0.0.0';
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ipStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      clientIp = ipStr.split(',')[0].trim();
    } else {
      clientIp = req.socket.remoteAddress || req.ip || '0.0.0.0';
    }
    res.json({ ip: clientIp });
  });

  // App Version & Build Check for client auto-update
  const BUILD_TIMESTAMP = Date.now().toString();
  app.get("/api/version", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      version: "2.1.0",
      buildTimestamp: BUILD_TIMESTAMP,
      timestamp: Date.now()
    });
  });

  // Send email verification code
  app.post("/api/auth/send-code", sendCode);

  // Verify code
  app.post("/api/auth/verify-code", verifyCode);

  // User account migration route (migrates local file ownership from email to Google)
  app.post("/api/auth/migrate-user", requireAuth, migrateUser);

  // Verify Recaptcha
  app.post("/api/verify-recaptcha", verifyRecaptcha);

  // Guarly AI 1.0 Chat Route
  app.post("/api/guarly/chat", handleGuarlyChat);

  // Server-side audit log recorder endpoint for logspupurim
  app.post("/api/logs/record", handleRecordLogExpress);
  app.get("/api/logs/list", handleFetchLogsExpress);

  // Roulette Endpoints
  app.get("/api/roulette/status", requireAuth, handleRouletteStatusExpress);
  app.post("/api/roulette/spin", requireAuth, handleRouletteSpinExpress);
  app.get("/api/admin/roulette/users", requireAuth, handleAdminRouletteUsersExpress);
  app.post("/api/admin/roulette/update-spins", requireAuth, handleAdminUpdateUserSpinsExpress);
  app.get("/api/admin/roulette/spins", requireAuth, handleAdminRouletteSpinsExpress);
  app.get("/api/admin/roulette/spins/:id", requireAuth, handleAdminRouletteSpinDetailExpress);

  // Security Probe Reporting Route
  app.all("/api/security/report-probe", (req, res) => {
    const probepath = req.query.path || req.body?.path || '';
    recordProbeAttempt(req, `Reported client probe: ${probepath}`);
    res.json({ success: true, recorded: true });
  });

  // Get APK pre-signed download URL from Cloudflare R2
  app.get("/api/update/download-url", async (req, res) => {
    try {
      const result = await getApkDownloadUrl();
      if (!result) {
        return res.status(500).json({ error: "Failed to generate APK download link" });
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Server] Error getting APK download URL:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Serve a secure, temporary pre-signed R2 URL redirect to save server bandwidth and CPU
  app.get("/api/update/download", async (req, res) => {
    try {
      const result = await getApkDownloadUrl();
      if (result && result.url) {
        console.log(`[Server] Redirecting client to secure pre-signed R2 URL (Expires in 5 min): ${result.key}`);
        return res.redirect(302, result.url);
      }
      return res.status(404).send("APK file not found or unable to fetch source from Cloudflare R2 bucket 'guarly'");
    } catch (err: any) {
      console.error("[Server] Error serving APK download redirect:", err);
      if (!res.headersSent) {
        res.status(500).send("Internal server error while fetching update file: " + (err.message || ""));
      }
    }
  });

  // Get EXE pre-signed download URL from Cloudflare R2
  app.get("/api/update/download-exe-url", async (req, res) => {
    try {
      const result = await getExeDownloadUrl();
      if (!result) {
        return res.status(500).json({ error: "Failed to generate EXE download link" });
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Server] Error getting EXE download URL:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Serve a secure, temporary pre-signed R2 URL redirect for EXE
  app.get("/api/update/download-exe", async (req, res) => {
    try {
      const result = await getExeDownloadUrl();
      if (result && result.url) {
        console.log(`[Server] Redirecting client to secure pre-signed R2 URL for EXE (Expires in 5 min): ${result.key}`);
        return res.redirect(302, result.url);
      }
      return res.status(404).send("EXE file not found or unable to fetch source from Cloudflare R2 bucket 'guarly'");
    } catch (err: any) {
      console.error("[Server] Error serving EXE download redirect:", err);
      if (!res.headersSent) {
        res.status(500).send("Internal server error while fetching update file: " + (err.message || ""));
      }
    }
  });

  // Mount API Routers
  app.use('/api/storage', storageRouter);
  app.use('/api/share', shareRouter);

  // Catch-all 404 handler for any invalid /api/* endpoints
  app.use('/api/*', (req, res) => {
    recordProbeAttempt(req, "Request to non-existent API endpoint");
    res.status(404).json({ error: "Esta página não existe ou não está disponível." });
  });

  // Vite middleware or Static serving logic
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Secure Vault server running on http://localhost:${PORT}`);
  });
}

startServer();
