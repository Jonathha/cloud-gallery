export const LOGS_PROJECT_ID = "gen-lang-client-0718492200";

let cachedToken = null;
let tokenExp = 0;

export function base64url(str) {
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function getGoogleAccessToken(env) {
  if (!env.LOGS_SERVICE_ACCOUNT) {
    throw new Error("LOGS_SERVICE_ACCOUNT secret is missing");
  }
  const sa = JSON.parse(env.LOGS_SERVICE_ACCOUNT);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: exp,
    iat: iat
  };

  const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const privateKeyString = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/[^a-zA-Z0-9+/=]/g, "");

  const binaryString = atob(privateKeyString);
  const binaryKey = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryKey[i] = binaryString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigString = String.fromCharCode(...new Uint8Array(signature));
  const jwt = `${unsignedToken}.${base64url(sigString)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch access token: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function getValidAccessToken(env) {
  if (cachedToken && Date.now() < tokenExp) {
    return cachedToken;
  }
  const token = await getGoogleAccessToken(env);
  cachedToken = token;
  tokenExp = Date.now() + 3000 * 1000;
  return token;
}
