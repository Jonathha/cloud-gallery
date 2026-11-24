export const EXPECTED_PROJECT_ID = "gen-lang-client-0718492200";
export const PRIMARY_FIREBASE_API_KEY = "AIzaSyB66ZqvvC3-TZoqvOUqPusY2IGMitx5ZS8";

/**
 * Constrói os cabeçalhos de autenticação e formato para o Firestore REST API
 */
export function buildFirestoreHeaders(idToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) {
    const cleanToken = idToken.startsWith('Bearer ') ? idToken.slice(7).trim() : idToken;
    headers['Authorization'] = `Bearer ${cleanToken}`;
  }
  return headers;
}

/**
 * Anexa a chave pública da API Firebase caso a requisição não utilize Bearer token
 */
export function appendApiKeyIfNeeded(url, idToken) {
  if (!idToken) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}key=${PRIMARY_FIREBASE_API_KEY}`;
  }
  return url;
}

/**
 * Constrói a URL canônica para um documento no Firestore REST API
 */
export function buildFirestoreDocUrl(collectionId, documentId, queryParam = '') {
  return `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}${queryParam}`;
}
