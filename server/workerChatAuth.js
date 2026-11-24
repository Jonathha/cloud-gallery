import { jsonResponse } from "./workerHelpers.js";
import { jwtVerify } from "jose";
import { JWKS, EXPECTED_PROJECT_ID } from "./workerChatState.js";

const tokenCache = new Map();

export async function validateBanco1Token(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Missing or invalid Authorization header");
  const idToken = authHeader.slice(7).trim();
  
  const now = Date.now();
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: "https://securetoken.google.com/" + EXPECTED_PROJECT_ID,
      audience: EXPECTED_PROJECT_ID,
      algorithms: ["RS256"]
    });
    const user = {
      uid: payload.sub || payload.user_id,
      email: payload.email || null,
      email_verified: payload.email_verified === true
    };
    
    // Cache for 60 seconds
    tokenCache.set(idToken, { user, expiresAt: now + 60000 });
    if (tokenCache.size > 200) {
      for (const [k, v] of tokenCache.entries()) {
        if (v.expiresAt <= now) tokenCache.delete(k);
      }
    }

    return user;
  } catch (err) {
    console.error("[validateBanco1Token] JWT verification failed:", err);
    throw new Error("Invalid or expired session token.");
  }
}

export async function handleChatAuth(request, env) {
  try {
    const verifiedUser = await validateBanco1Token(request.headers.get("Authorization"));
    return jsonResponse({ success: true, uid: verifiedUser.uid, verified: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Authentication failed" }, 401);
  }
}
