import {
  buildFirestoreHeaders,
  appendApiKeyIfNeeded,
  buildFirestoreDocUrl
} from "./constants.js";
import { parseFirestoreValue } from "./valueParsers.js";

/**
 * Busca um documento no Firestore via REST API
 * @param {string} collectionId Nome da coleção
 * @param {string} documentId ID do documento
 * @param {string} [idToken] Bearer token de autenticação
 * @returns {Promise<Object|null>} Documento encontrado ou null caso 404
 */
export async function getFirestoreDocREST(collectionId, documentId, idToken) {
  const url = appendApiKeyIfNeeded(buildFirestoreDocUrl(collectionId, documentId), idToken);
  const headers = buildFirestoreHeaders(idToken);
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 404) return null;
    const errText = await response.text();
    throw new Error(`Firestore REST get failed: ${errText}`);
  }

  const doc = await response.json();
  const fields = {};
  for (const [key, valObj] of Object.entries(doc.fields || {})) {
    fields[key] = parseFirestoreValue(valObj);
  }

  return {
    id: documentId,
    _updateTime: doc.updateTime,
    _createTime: doc.createTime,
    ...fields
  };
}
