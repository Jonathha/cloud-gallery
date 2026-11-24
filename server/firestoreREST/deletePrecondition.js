import {
  EXPECTED_PROJECT_ID,
  buildFirestoreHeaders,
  appendApiKeyIfNeeded,
  buildFirestoreDocUrl
} from "./constants.js";

export async function deleteFirestoreDocWithPreconditionREST(collectionId, documentId, precondition, idToken) {
  let queryParam = '';
  if (precondition?.updateTime) {
    queryParam = `?currentDocument.updateTime=${encodeURIComponent(precondition.updateTime)}`;
  } else if (precondition?.exists !== undefined) {
    queryParam = `?currentDocument.exists=${precondition.exists}`;
  }

  const url = appendApiKeyIfNeeded(buildFirestoreDocUrl(collectionId, documentId, queryParam), idToken);
  const headers = buildFirestoreHeaders(idToken);
  const response = await fetch(url, { method: 'DELETE', headers });

  if (!response.ok) {
    if (response.status === 404) return true;
    const errText = await response.text();
    let errJson = null;
    try { errJson = JSON.parse(errText); } catch (e) {}

    const isPreconditionFailed = response.status === 409 || response.status === 400 || response.status === 412 ||
      errText.includes('FAILED_PRECONDITION') || errText.includes('ABORTED') ||
      errJson?.error?.status === 'FAILED_PRECONDITION';

    if (isPreconditionFailed) {
      const err = new Error('Precondition failed for delete: document was modified');
      err.code = 'PRECONDITION_FAILED';
      err.status = 409;
      throw err;
    }
    throw new Error(`Firestore delete with precondition failed: ${errText}`);
  }
  return true;
}
