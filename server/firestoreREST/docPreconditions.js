import {
  EXPECTED_PROJECT_ID,
  buildFirestoreHeaders,
  appendApiKeyIfNeeded
} from "./constants.js";
import { toFirestoreValue } from "./valueParsers.js";

export async function createFirestoreDocIfNotExistREST(collectionId, documentId, data, idToken) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}?currentDocument.exists=false`;
  const url = appendApiKeyIfNeeded(baseUrl, idToken);
  const headers = buildFirestoreHeaders(idToken);

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errText = await response.text();
    let errJson = null;
    try { errJson = JSON.parse(errText); } catch (e) {}
    
    const isAlreadyExists = response.status === 409 || 
                            response.status === 400 || 
                            response.status === 412 ||
                            errText.includes('ALREADY_EXISTS') || 
                            errText.includes('FAILED_PRECONDITION') || 
                            errText.includes('ABORTED') ||
                            errJson?.error?.status === 'ALREADY_EXISTS' ||
                            errJson?.error?.status === 'FAILED_PRECONDITION';
    
    if (isAlreadyExists) {
      const err = new Error('Document already exists or precondition failed: ALREADY_EXISTS');
      err.code = 'ALREADY_EXISTS';
      err.status = 409;
      throw err;
    }

    const err = new Error(`Firestore create with exists=false failed: ${errText}`);
    err.status = response.status;
    throw err;
  }

  const doc = await response.json();
  return { success: true, doc, _updateTime: doc.updateTime };
}
