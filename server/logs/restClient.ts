import { LOGS_PROJECT_ID, LOGS_API_KEY } from './constants';
import { toFirestoreValue, parseFirestoreDoc } from './firestoreHelpers';

export async function writeLogsDocREST(
  collectionId: string,
  data: Record<string, any>,
  documentId: string | null = null
): Promise<boolean> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      fields[k] = toFirestoreValue(v);
    }
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}`;
  const url = documentId ? `${baseUrl}/${documentId}?key=${LOGS_API_KEY}` : `${baseUrl}?key=${LOGS_API_KEY}`;
  const method = documentId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[ServerLogs] Erro na escrita do Firestore REST para ${collectionId}:`, errText);
    return false;
  }
  return true;
}

export async function listLogsDocREST(collectionId: string): Promise<any[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}?key=${LOGS_API_KEY}&pageSize=300`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`[ServerLogs] Erro ao listar ${collectionId}:`, await response.text());
    return [];
  }
  const json = await response.json();
  const documents = json.documents || [];
  return documents.map(parseFirestoreDoc);
}
