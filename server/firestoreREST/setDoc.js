import {
  EXPECTED_PROJECT_ID,
  buildFirestoreHeaders,
  appendApiKeyIfNeeded,
  buildFirestoreDocUrl
} from "./constants.js";
import { toFirestoreValue } from "./valueParsers.js";

export async function setFirestoreDocREST(collectionId, documentId, data, idToken) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}?documentId=${documentId}`;
  const url = appendApiKeyIfNeeded(baseUrl, idToken);
  const headers = buildFirestoreHeaders(idToken);
  
  let response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });
  
  if (response.status === 409) {
    const patchUrl = appendApiKeyIfNeeded(buildFirestoreDocUrl(collectionId, documentId), idToken);
    response = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields })
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore REST set failed: ${errText}`);
  }
  return true;
}

export async function deleteFirestoreDocREST(collectionId, documentId, idToken) {
  const url = appendApiKeyIfNeeded(buildFirestoreDocUrl(collectionId, documentId), idToken);
  const headers = buildFirestoreHeaders(idToken);
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok) {
    if (response.status === 404) return true;
    const errText = await response.text();
    throw new Error(`Firestore REST delete failed: ${errText}`);
  }
  return true;
}
