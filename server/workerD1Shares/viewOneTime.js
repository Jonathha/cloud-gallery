export function mapShareViewRow(row, isOneTime = false, firstViewedAt = null) {
  const share = {
    id: row.id,
    ownerId: row.owner_id,
    imageId: row.image_id,
    mediaType: row.media_type,
    status: row.status,
    expiresAt: row.expires_at,
    viewCount: row.view_count,
    isOneTime
  };
  if (isOneTime) {
    share.firstViewedAt = firstViewedAt;
    share.firstViewerIp = row.first_viewer_ip;
  }
  share.passwordHash = row.password_hash;
  share.encryptedShareKey = row.encrypted_share_key;
  share.createdAt = row.created_at;
  return share;
}

export async function claimFirstShareView(db, shareId, viewerIp, now) {
  const claimed = await db.prepare(
    "UPDATE user_shares_store SET view_count = view_count + 1, first_viewed_at = ?, first_viewer_ip = ?, updated_at = ? WHERE id = ? AND status = 'active' AND first_viewed_at IS NULL RETURNING *"
  ).bind(now, viewerIp, now, shareId).first();
  return claimed ? mapShareViewRow(claimed, true, claimed.first_viewed_at) : null;
}

export function isUsableViewerIp(ip) {
  if (typeof ip !== "string") return false;
  const value = ip.trim();
  return value.length > 0 && value !== "0.0.0.0" && value !== "::" && value.toLowerCase() !== "unknown";
}

export async function resolveOneTimeShareRetry(db, row, shareId, viewerIp, now) {
  const oneMinute = 60 * 1000;
  const firstViewedAt = row.first_viewed_at || null;
  if (firstViewedAt) {
    if (now - firstViewedAt > oneMinute) {
      if (row.status !== "consumed") {
        await db.prepare("UPDATE user_shares_store SET status = 'consumed', updated_at = ? WHERE id = ?")
          .bind(now, shareId).run();
      }
      return { handled: true, share: null };
    }
    if (!isUsableViewerIp(row.first_viewer_ip) || row.first_viewer_ip.trim() !== viewerIp) {
      return { handled: true, share: null };
    }
    return { handled: true, share: mapShareViewRow(row, true, firstViewedAt) };
  }
  if (row.status === "consumed" && isUsableViewerIp(row.first_viewer_ip) &&
      row.first_viewer_ip.trim() === viewerIp && now - row.updated_at <= oneMinute) {
    return { handled: true, share: mapShareViewRow(row, true, row.first_viewed_at || row.updated_at) };
  }
  return { handled: false, share: null };
}
