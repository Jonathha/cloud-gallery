import { jsonResponse } from "../workerHelpers.js";
import { verifyFirebaseIdToken, extractBearerToken, isUserAdmin } from "./auth.js";
import { listLogsDocREST } from "./firestore.js";

export async function handleFetchLogs(request, env) {
  try {
    const url = new URL(request.url);
    const collectionId = url.searchParams.get("collection");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    if (!collectionId || !["user_accesses", "audit_logs", "security_events"].includes(collectionId)) {
      return jsonResponse({ success: false, error: "Coleção inválida." }, 400);
    }

    const idToken = extractBearerToken(request);
    const verifiedUser = idToken ? await verifyFirebaseIdToken(idToken) : null;

    // Validação de segurança: apenas administradores podem consultar logs
    if (!verifiedUser || !isUserAdmin(verifiedUser.email, env)) {
      return jsonResponse({ 
        success: false, 
        error: "Acesso restrito a administradores.",
        userEmail: verifiedUser ? verifiedUser.email : null
      }, 403);
    }

    const records = await listLogsDocREST(collectionId, limit, env);
    return jsonResponse({ success: true, records, verifiedUser: verifiedUser ? verifiedUser.email : null });
  } catch (err) {
    console.error("[WorkerLogs] Erro ao buscar logs:", err);
    return jsonResponse({ success: false, records: [] }, 500);
  }
}
