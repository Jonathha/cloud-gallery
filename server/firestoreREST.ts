export const EXPECTED_PROJECT_ID = "gen-lang-client-0718492200";

function parseFirestoreValue(valObj: any): any {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('mapValue' in valObj) {
    const mapFields: any = {};
    for (const [k, v] of Object.entries(valObj.mapValue.fields || {})) {
      mapFields[k] = parseFirestoreValue(v);
    }
    return mapFields;
  }
  if ('arrayValue' in valObj) {
    return (valObj.arrayValue.values || []).map((v: any) => parseFirestoreValue(v));
  }
  return null;
}

export function toFirestoreValue(val: any): any {
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
    const fields: any = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export async function queryFirestoreREST(collectionId: string, userId: string, idToken: string) {
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
    .filter((r: any) => r.document)
    .map((r: any) => {
      const doc = r.document;
      const id = doc.name.split('/').pop();
      const fields: any = {};
      for (const [key, valObj] of Object.entries(doc.fields || {})) {
        fields[key] = parseFirestoreValue(valObj);
      }
      return { id, ...fields };
    });
}

export async function getFirestoreDocREST(collectionId: string, documentId: string, idToken: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    const errText = await response.text();
    throw new Error(`Firestore REST get failed: ${errText}`);
  }
  const doc = await response.json();
  const fields: any = {};
  for (const [key, valObj] of Object.entries(doc.fields || {})) {
    fields[key] = parseFirestoreValue(valObj);
  }
  return { id: documentId, _updateTime: doc.updateTime, _createTime: doc.createTime, ...fields };
}

export async function createFirestoreDocIfNotExistREST(collectionId: string, documentId: string, data: any, idToken: string) {
  const fields: any = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}?currentDocument.exists=false`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errText = await response.text();
    let errJson: any = null;
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
      const err: any = new Error('Document already exists or precondition failed: ALREADY_EXISTS');
      err.code = 'ALREADY_EXISTS';
      err.status = 409;
      throw err;
    }

    const err: any = new Error(`Firestore create with exists=false failed: ${errText}`);
    err.status = response.status;
    throw err;
  }

  const doc = await response.json();
  return { success: true, doc, _updateTime: doc.updateTime };
}

export async function updateFirestoreDocWithPreconditionREST(collectionId: string, documentId: string, data: any, precondition: { updateTime?: string; exists?: boolean }, idToken: string) {
  const fields: any = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  let queryParam = '';
  if (precondition?.updateTime) {
    queryParam = `?currentDocument.updateTime=${encodeURIComponent(precondition.updateTime)}`;
  } else if (precondition?.exists !== undefined) {
    queryParam = `?currentDocument.exists=${precondition.exists}`;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}${queryParam}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errText = await response.text();
    let errJson: any = null;
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
      const err: any = new Error('Precondition failed: document was modified or does not match');
      err.code = 'PRECONDITION_FAILED';
      err.status = 409;
      throw err;
    }

    const err: any = new Error(`Firestore update with precondition failed: ${errText}`);
    err.status = response.status;
    throw err;
  }

  const doc = await response.json();
  return { success: true, doc, _updateTime: doc.updateTime };
}

export async function deleteFirestoreDocWithPreconditionREST(collectionId: string, documentId: string, precondition: { updateTime?: string; exists?: boolean }, idToken: string) {
  let queryParam = '';
  if (precondition?.updateTime) {
    queryParam = `?currentDocument.updateTime=${encodeURIComponent(precondition.updateTime)}`;
  } else if (precondition?.exists !== undefined) {
    queryParam = `?currentDocument.exists=${precondition.exists}`;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}${queryParam}`;
  const headers = {
    'Authorization': `Bearer ${idToken}`
  };

  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    if (response.status === 404) return true;
    const errText = await response.text();
    let errJson: any = null;
    try { errJson = JSON.parse(errText); } catch (e) {}

    const isPreconditionFailed = response.status === 409 || 
                                 response.status === 400 || 
                                 response.status === 412 ||
                                 errText.includes('FAILED_PRECONDITION') || 
                                 errText.includes('ABORTED') ||
                                 errJson?.error?.status === 'FAILED_PRECONDITION';

    if (isPreconditionFailed) {
      const err: any = new Error('Precondition failed for delete: document was modified');
      err.code = 'PRECONDITION_FAILED';
      err.status = 409;
      throw err;
    }

    const err: any = new Error(`Firestore delete with precondition failed: ${errText}`);
    err.status = response.status;
    throw err;
  }

  return true;
}

export async function setFirestoreDocREST(collectionId: string, documentId: string, data: any, idToken: string) {
  const fields: any = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}?documentId=${documentId}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  };
  
  let response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });
  
  if (response.status === 409) {
    const patchUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;
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

export async function deleteFirestoreDocREST(collectionId: string, documentId: string, idToken: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });
  if (!response.ok) {
    if (response.status === 404) return true;
    const errText = await response.text();
    throw new Error(`Firestore REST delete failed: ${errText}`);
  }
  return true;
}

