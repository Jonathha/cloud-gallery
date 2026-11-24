import { EXPECTED_PROJECT_ID } from "./constants.js";
import { parseFirestoreValue } from "./valueParsers.js";

export async function queryFirestoreREST(collectionId, userId, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: { fieldFilter: { field: { fieldPath: "userId" }, op: "EQUAL", value: { stringValue: userId } } }
      }
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore REST query failed: ${errText}`);
  }
  
  const results = await response.json();
  if (!Array.isArray(results)) return [];
  
  return results.filter((r) => r.document).map((r) => {
    const doc = r.document;
    const id = doc.name.split('/').pop();
    const fields = {};
    for (const [key, valObj] of Object.entries(doc.fields || {})) {
      fields[key] = parseFirestoreValue(valObj);
    }
    return { id, ...fields };
  });
}
