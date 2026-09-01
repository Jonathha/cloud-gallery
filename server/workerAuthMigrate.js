import { jsonResponse } from "./workerHelpers.js";

export async function handleMigrateUser(request, env) {
  const { oldUserId, newUserId } = await request.json();
  if (!oldUserId || !newUserId) {
    return jsonResponse({ success: false, error: "oldUserId and newUserId are required" }, 400);
  }

  return jsonResponse({ success: true, migratedCount: 0, migratedImageIds: [] });
}

