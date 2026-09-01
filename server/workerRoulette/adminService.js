import { executeD1Query, executeD1Run } from "./d1Client.js";

export async function getAdminRouletteUsers(env) {
  const queryRes = await executeD1Query(
    env,
    "SELECT user_id, email, spins_remaining, total_spins, last_activity, created_at FROM roulette_users ORDER BY last_activity DESC LIMIT 150"
  );
  return queryRes.results || [];
}

export async function getAdminRouletteSpins(env) {
  const queryRes = await executeD1Query(
    env,
    "SELECT id, user_id, user_email, reward_id, reward_amount, reward_label, reward_tier, spins_remaining, ip, created_at FROM roulette_spins ORDER BY created_at DESC LIMIT 150"
  );
  return queryRes.results || [];
}

export async function getAdminRouletteSpinById(env, spinId) {
  const queryRes = await executeD1Query(
    env,
    "SELECT id, user_id, user_email, reward_id, reward_amount, reward_label, reward_tier, strip_item_ids, jitter, spins_remaining, ip, created_at FROM roulette_spins WHERE id = ?",
    [spinId]
  );
  if (!queryRes.results || queryRes.results.length === 0) {
    return null;
  }
  const row = queryRes.results[0];
  let stripItemIds = [];
  try {
    stripItemIds = JSON.parse(row.strip_item_ids);
  } catch {
    stripItemIds = [];
  }
  return {
    ...row,
    stripItemIds
  };
}

export async function updateAdminUserSpins(env, userId, delta) {
  const now = Date.now();
  await executeD1Run(
    env,
    "INSERT OR IGNORE INTO roulette_users (user_id, email, spins_remaining, total_spins, last_activity, created_at) VALUES (?, NULL, 3, 0, ?, ?)",
    [userId, now, now]
  );
  await executeD1Run(
    env,
    "UPDATE roulette_users SET spins_remaining = MAX(0, spins_remaining + ?), last_activity = ? WHERE user_id = ?",
    [delta, now, userId]
  );
  const selectRes = await executeD1Query(
    env,
    "SELECT user_id, email, spins_remaining, total_spins, last_activity, created_at FROM roulette_users WHERE user_id = ?",
    [userId]
  );
  return (selectRes.results && selectRes.results[0]) || null;
}

