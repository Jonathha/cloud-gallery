import {
  EXPECTED_PROJECT_ID,
  buildFirestoreHeaders,
  appendApiKeyIfNeeded
} from "./constants.js";
import { toFirestoreValue } from "./valueParsers.js";

export async function updateFirestoreDocWithPreconditionREST(collectionId, documentId, data, precondition, idToken) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  let queryParam = '';
  if (precondition?.updateTime) {
    queryParam = `?currentDocument.updateTime=${encodeURIComponent(precondition.updateTime)}`;
  } else if (precondition?.exists !== undefined) {
    queryParam = `?currentDocument.exists=${precondition.exists}`;
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}${queryParam}`;
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

    const isPreconditionFailed = response.status === 409 || 
                                 response.status === 400 || 
                                 response.status === 412 ||
                                 errText.includes('FAILED_PRECONDITION') || 
                                 errText.includes('ABORTED') || 
                                 errText.includes('ALREADY_EXISTS') ||
                                 errJson?.error?.status === 'FAILED_PRECONDITION' ||
                                 errJson?.error?.status === 'ABORTED';

    if (isPreconditionFailed) {
      const err = new Error('Precondition failed: document was modified or does not match');
      err.code = 'PRECONDITION_FAILED';
      err.status = 409;
      throw err;
    }

    const err = new Error(`Firestore update with precondition failed: ${errText}`);
    err.status = response.status;
    throw err;
  }

  const doc = await response.json();
  return { success: true, doc, _updateTime: doc.updateTime };
}
