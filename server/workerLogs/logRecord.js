import { jsonResponse } from "../workerHelpers.js";
import { verifyFirebaseIdToken, extractBearerToken } from "./auth.js";
import { extractClientContext, buildUserAccessDoc } from "./logRecordUserAccess.js";
import { buildAuditDoc, buildSecurityDoc } from "./logRecordAuditSecurity.js";
import { saveSecurityLogD1 } from "../workerD1Logs.js";

export async function handleRecordLog(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const { logType, data } = body;

    if (!logType || !data) {
      return jsonResponse({ success: false, error: "Parâmetros inválidos." }, 400);
    }

    const ctx = extractClientContext(request, body);
    const idToken = extractBearerToken(request, body);
    let verifiedUser = null;
    if (idToken) {
      try {
        verifiedUser = await verifyFirebaseIdToken(idToken);
      } catch (authErr) {
        console.warn("[WorkerLogs] Token verification warning in logs:", authErr);
      }
    }
    const timestamp = Date.now();
    const db = env.DB || env.DATABASE || env.d1;

    let docData, docId;
    if (logType === "user_access") {
      const res = buildUserAccessDoc(verifiedUser, data, ctx, timestamp);
      docData = res.docData;
      docId = res.docId;
    } else if (logType === "audit") {
      docData = buildAuditDoc(verifiedUser, data, ctx, timestamp);
      docId = `audit_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
    } else if (logType === "security") {
      docData = buildSecurityDoc(verifiedUser, data, ctx, timestamp);
      docId = `sec_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
    } else {
      return jsonResponse({ success: false, error: "Tipo de log inválido." }, 400);
    }

    if (db) {
      await saveSecurityLogD1(db, {
        id: docId,
        userId: verifiedUser?.uid || data.userId || "anonymous",
        eventType: logType,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        details: docData,
        timestamp
      });
    }

    return jsonResponse({ success: true, verified: !!verifiedUser });
  } catch (err) {
    console.error("[WorkerLogs] Erro interno em handleRecordLog:", err);
    return jsonResponse({ success: false, error: "Erro interno ao salvar log: " + (err.message || String(err)) }, 500);
  }
}
