import { jsonResponse } from "../workerHelpers.js";
import { verifyFirebaseIdToken, extractBearerToken } from "./auth.js";
import { writeLogsDocREST } from "./firestore.js";
import { extractClientContext, buildUserAccessDoc } from "./logRecordUserAccess.js";
import { buildAuditDoc, buildSecurityDoc } from "./logRecordAuditSecurity.js";

export async function handleRecordLog(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const { logType, data } = body;

    if (!logType || !data) {
      return jsonResponse({ success: false, error: "Parâmetros inválidos." }, 400);
    }

    const ctx = extractClientContext(request, body);
    const idToken = extractBearerToken(request, body);
    const verifiedUser = idToken ? await verifyFirebaseIdToken(idToken) : null;
    const timestamp = Date.now();

    if (logType === "user_access") {
      const { docData, docId } = buildUserAccessDoc(verifiedUser, data, ctx, timestamp);
      await writeLogsDocREST("user_accesses", docData, docId, env);
      return jsonResponse({ success: true, verified: !!verifiedUser });
    }

    if (logType === "audit") {
      const docData = buildAuditDoc(verifiedUser, data, ctx, timestamp);
      await writeLogsDocREST("audit_logs", docData, null, env);
      return jsonResponse({ success: true, verified: !!verifiedUser });
    }

    if (logType === "security") {
      const docData = buildSecurityDoc(verifiedUser, data, ctx, timestamp);
      await writeLogsDocREST("security_events", docData, null, env);
      return jsonResponse({ success: true, verified: !!verifiedUser });
    }

    return jsonResponse({ success: false, error: "Tipo de log inválido." }, 400);
  } catch (err) {
    console.error("[WorkerLogs] Erro interno em handleRecordLog:", err);
    return jsonResponse({ success: false, error: "Erro interno ao salvar log: " + (err.message || String(err)) }, 500);
  }
}
