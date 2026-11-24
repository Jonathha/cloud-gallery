import { ensureD1SharesSchema } from "./schema.js";
import { mapShareViewRow, claimFirstShareView } from "./viewOneTime.js";
import { isUsableViewerIp, resolveOneTimeShareRetry } from "./viewOneTime.js";

/**
 * Gets a share by ID for public viewing, checking expiration and atomic view counting.
 */
export async function getShareForViewD1(db, shareId, clientIp = null) {
  if (!db || !shareId) return null;
  await ensureD1SharesSchema(db);

  const now = Date.now();
  const twoMinutesAgo = now - 120000;
  const viewerIp = typeof clientIp === "string" ? clientIp.trim() : "0.0.0.0";

  // Log access & clean old logs, then check surge: more than 3 *different* viewers in 2 minutes.
  // The same viewer refreshing never counts against itself, nor is blocked by its own earlier hits.
  try {
    await db.prepare("DELETE FROM share_access_logs WHERE accessed_at < ?").bind(twoMinutesAgo).run();

    const surgeCheck = await db.prepare(
      "SELECT COUNT(DISTINCT viewer_ip) as cnt FROM share_access_logs WHERE share_id = ? AND accessed_at > ? AND viewer_ip != ?"
    ).bind(shareId, twoMinutesAgo, viewerIp).first();

    if (surgeCheck && surgeCheck.cnt >= 3) {
      return { highDemand: true };
    }

    await db.prepare("INSERT INTO share_access_logs (share_id, viewer_ip, accessed_at) VALUES (?, ?, ?)")
      .bind(shareId, viewerIp, now).run();
  } catch (e) {
    console.warn("[getShareForViewD1] Surge check warning:", e);
  }

  let row = await db.prepare("SELECT * FROM user_shares_store WHERE id = ?").bind(shareId).first();
  if (!row) return null;

  if (row.expires_at && row.expires_at < now) {
    await db.prepare("UPDATE user_shares_store SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'active'")
      .bind(now, shareId).run();
    return null;
  }
  if (row.status === "expired" || row.status === "revoked") return null;
  if (row.is_one_time) {
    if (!isUsableViewerIp(viewerIp)) return null;
    if (!row.first_viewed_at && row.status === "active") {
      const claimed = await claimFirstShareView(db, shareId, viewerIp, now);
      if (claimed) return claimed;
      row = await db.prepare("SELECT * FROM user_shares_store WHERE id = ?").bind(shareId).first();
      if (!row) return null;
    }
    const result = await resolveOneTimeShareRetry(db, row, shareId, viewerIp, now);
    return result.handled ? result.share : null;
  }
  if (row.status !== "active") return null;
  const viewed = await db.prepare(
    "UPDATE user_shares_store SET view_count = view_count + 1, updated_at = ? WHERE id = ? AND status = 'active' RETURNING *"
  ).bind(now, shareId).first();
  return viewed ? mapShareViewRow(viewed) : null;
}

