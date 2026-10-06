import { createRemoteJWKSet } from "jose";

export const JWKS_URL = new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
export const JWKS = createRemoteJWKSet(JWKS_URL);
export const EXPECTED_PROJECT_ID = "gen-lang-client-0718492200";

export function getChatServiceAccount(env) {
  const privateKey = env?.CHAT_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("CHAT_SERVICE_ACCOUNT_PRIVATE_KEY is not configured");
  }

  return {
    client_email: "firebase-adminsdk-fbsvc@chat-809dc.iam.gserviceaccount.com",
    private_key: privateKey
  };
}
