export function createMockD1() {
  const store = new Map();
  const dbMock = {
    exec: async () => {},
    prepare: (sql) => ({
      bind: (...args) => ({
        first: async () => {
          if (sql.includes("SELECT * FROM user_shares_store WHERE id = ?")) return store.get(args[0]) || null;
          if (sql.includes("UPDATE user_shares_store SET view_count = view_count + 1, first_viewed_at = ?")) {
            const [now, clientIp, updatedNow, shareId] = args;
            const row = store.get(shareId);
            if (row && row.status === "active" && (!sql.includes("first_viewed_at IS NULL") || row.first_viewed_at == null)) {
              row.view_count += 1;
              row.first_viewed_at = now;
              row.first_viewer_ip = clientIp;
              row.updated_at = updatedNow;
              store.set(shareId, row);
              return row;
            }
          }
          return null;
        },
        run: async () => {
          if (sql.includes("SET status = 'consumed'")) {
            const [now, shareId] = args;
            const row = store.get(shareId);
            if (row) {
              row.status = "consumed";
              row.updated_at = now;
              store.set(shareId, row);
            }
          }
          return { success: true };
        },
      }),
    }),
  };
  return { store, dbMock };
}

export function createInitialShareRow(shareId) {
  return {
    id: shareId, owner_id: "user-1", image_id: "img-1",
    media_type: "image", status: "active",
    expires_at: Date.now() + 3600000, view_count: 0,
    is_one_time: 1, first_viewed_at: null, first_viewer_ip: null,
    password_hash: null, encrypted_share_key: "key-data",
    created_at: Date.now(), updated_at: Date.now(),
  };
}
