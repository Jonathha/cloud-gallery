export const EXPECTED_PROJECT_ID = "gen-lang-client-0718492200";
export const PRIMARY_FIREBASE_API_KEY = "AIzaSyB66ZqvvC3-TZoqvOUqPusY2IGMitx5ZS8";

function parseFirestoreValue(valObj) {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('mapValue' in valObj) {
    const mapFields = {};
    for (const [k, v] of Object.entries(valObj.mapValue.fields || {})) {
      mapFields[k] = parseFirestoreValue(v);
    }
    return mapFields;
  }
  if ('arrayValue' in valObj) {
    return (valObj.arrayValue.values || []).map((v) => parseFirestoreValue(v));
  }
  return null;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function buildFirestoreHeaders(idToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
}

function appendApiKeyIfNeeded(url, idToken) {
  if (!idToken) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}key=${PRIMARY_FIREBASE_API_KEY}`;
  }
  return url;
}

export async function setFirestoreDocREST(collectionId, documentId, data, idToken) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}?documentId=${documentId}`;
  const url = appendApiKeyIfNeeded(baseUrl, idToken);
  const headers = buildFirestoreHeaders(idToken);
  
  // Try POST first for creation
  let response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });
  
  if (response.status === 409) { // Already exists, patch it
    const patchBaseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;
    const patchUrl = appendApiKeyIfNeeded(patchBaseUrl, idToken);
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
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;
  const url = appendApiKeyIfNeeded(baseUrl, idToken);
  const headers = buildFirestoreHeaders(idToken);
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) {
    if (response.status === 404) return true;
    const errText = await response.text();
    throw new Error(`Firestore REST delete failed: ${errText}`);
  }
  return true;
}

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

export async function deleteFirestoreDocWithPreconditionREST(collectionId, documentId, precondition, idToken) {
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
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    if (response.status === 404) return true; // Already deleted
    const errText = await response.text();
    let errJson = null;
    try { errJson = JSON.parse(errText); } catch (e) {}

    const isPreconditionFailed = response.status === 409 || 
                                 response.status === 400 || 
                                 response.status === 412 ||
                                 errText.includes('FAILED_PRECONDITION') || 
                                 errText.includes('ABORTED') ||
                                 errJson?.error?.status === 'FAILED_PRECONDITION';

    if (isPreconditionFailed) {
      const err = new Error('Precondition failed for delete: document was modified');
      err.code = 'PRECONDITION_FAILED';
      err.status = 409;
      throw err;
    }

    const err = new Error(`Firestore delete with precondition failed: ${errText}`);
    err.status = response.status;
    throw err;
  }

  return true;
}

export async function getFirestoreDocREST(collectionId, documentId, idToken) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;
  const url = appendApiKeyIfNeeded(baseUrl, idToken);
  const headers = buildFirestoreHeaders(idToken);
  const response = await fetch(url, {
    headers
  });
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
  return { id: documentId, _updateTime: doc.updateTime, _createTime: doc.createTime, ...fields };
}

export async function queryFirestoreREST(collectionId, userId, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: "userId" },
            op: "EQUAL",
            value: { stringValue: userId }
          }
        }
      }
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore REST query failed: ${errText}`);
  }
  
  const results = await response.json();
  if (!Array.isArray(results)) return [];
  
  return results
    .filter((r) => r.document)
    .map((r) => {
      const doc = r.document;
      const id = doc.name.split('/').pop();
      const fields = {};
      for (const [key, valObj] of Object.entries(doc.fields || {})) {
        fields[key] = parseFirestoreValue(valObj);
      }
      return { id, ...fields };
    });
}

