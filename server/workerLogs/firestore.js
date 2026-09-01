import { LOGS_PROJECT_ID, getValidAccessToken } from "./serviceAccount.js";
import { toFirestoreValue, parseFirestoreDoc } from "./firestoreHelpers.js";

export async function writeLogsDocREST(collectionId, data, documentId = null, env = null) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      fields[k] = toFirestoreValue(v);
    }
  }

  let url;
  let method;

  if (documentId) {
    url = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;
    method = 'PATCH';
  } else {
    url = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}`;
    method = 'POST';
  }

  let accessToken = null;
  try {
    if (!env) throw new Error("env parameter is required");
    accessToken = await getValidAccessToken(env);
  } catch (err) {
    console.error("[WorkerLogs] Erro ao obter token do Service Account:", err);
    throw new Error("Falha na autenticação do Worker.");
  }

  const response = await fetch(url, {
    method,
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[WorkerLogs] Erro na escrita do Firestore REST para ${collectionId}:`, errText);
    throw new Error(`Firestore REST write failed (${response.status}): ${errText}`);
  }

  return true;
}

export async function listLogsDocREST(collectionId, pageSize = 50, env = null) {
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  const url = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}?pageSize=${safePageSize}`;
  
  let accessToken = null;
  try {
    if (!env) throw new Error("env parameter is required");
    accessToken = await getValidAccessToken(env);
  } catch (err) {
    console.error("[WorkerLogs] Erro ao obter token do Service Account:", err);
    return [];
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    console.error(`[WorkerLogs] Erro ao listar ${collectionId}:`, await response.text());
    return [];
  }
  const json = await response.json();
  const documents = json.documents || [];
  return documents.map(parseFirestoreDoc);
}
