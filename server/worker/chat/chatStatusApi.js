import { jsonResponse } from "../../workerHelpers.js";

export async function handleChatMigration(request, env) {
  return jsonResponse({ success: true, migrated: 0 });
}

export async function handleChatStatus(request, env) {
  return jsonResponse({ success: true, status: "ok" });
}
