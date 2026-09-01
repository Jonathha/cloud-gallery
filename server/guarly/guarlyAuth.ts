import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS_URL = new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
const JWKS = createRemoteJWKSet(JWKS_URL);
const EXPECTED_PROJECT_ID = "gen-lang-client-0718492200";

export async function validateBanco1Token(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${EXPECTED_PROJECT_ID}`,
      audience: EXPECTED_PROJECT_ID,
      algorithms: ["RS256"]
    });

    return {
      uid: payload.sub || payload.user_id,
      email: payload.email || null,
      email_verified: payload.email_verified !== undefined ? payload.email_verified : true
    };
  } catch (err: any) {
    console.error("[validateBanco1Token] JWT verification failed:", err);
    throw new Error(`Invalid or expired session token (Banco 1): ${err.message}`);
  }
}
