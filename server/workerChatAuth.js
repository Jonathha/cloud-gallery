import { jsonResponse } from "./workerHelpers.js";
import { jwtVerify, importPKCS8, SignJWT } from "jose";
import { JWKS, EXPECTED_PROJECT_ID, CHAT_SERVICE_ACCOUNT } from "./workerChatState.js";

// Validate Banco 1 ID Token against Google Public JWKS (RS256)
export async function validateBanco1Token(authHeader) {
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
  } catch (err) {
    console.error("[validateBanco1Token] JWT verification failed:", err, err.stack);
    throw new Error(`Invalid or expired session token (Banco 1): ${err.message}`);
  }
}

async function createFirebaseCustomToken(uid) {
  const { client_email, private_key } = CHAT_SERVICE_ACCOUNT;
  const key = await importPKCS8(private_key, "RS256");

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const jwt = await new SignJWT({
    uid: uid
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(client_email)
    .setSubject(client_email)
    .setAudience("https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit")
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key);

  return jwt;
}

export async function handleChatAuth(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    const verifiedUser = await validateBanco1Token(authHeader);

    // Create Firebase Custom Token for Chat using the service account
    const customToken = await createFirebaseCustomToken(verifiedUser.uid);

    return jsonResponse({
      success: true,
      uid: verifiedUser.uid,
      customToken,
      verified: true
    });
  } catch (err) {
    console.error("[handleChatAuth] Detailed Error:", err, err.stack);
    return jsonResponse({ 
      success: false, 
      error: err.message || "Authentication failed",
      stack: err.stack
    }, 401);
  }
}
