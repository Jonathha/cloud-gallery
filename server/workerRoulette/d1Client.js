const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "47ee460c72b6f01c35d72f13ebf8afbf";
const CLOUDFLARE_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || "6ee35aec-ac66-4fcb-ac12-4de74213d21c";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";


export async function executeD1Query(env, sql, params = []) {
  if (env && env.DB && typeof env.DB.prepare === 'function') {
    try {
      const stmt = env.DB.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.all();
      return {
        results: result.results || [],
        success: result.success !== false,
        changes: result.meta ? result.meta.changes : 0
      };
    } catch (err) {
      console.error("[D1_CLIENT_WORKER_ERROR]", err);
      throw err;
    }
  }

  // Fallback para ambiente REST / Node Express
  const token = env?.CLOUDFLARE_API_TOKEN || CLOUDFLARE_API_TOKEN;
  const accountId = env?.CLOUDFLARE_ACCOUNT_ID || CLOUDFLARE_ACCOUNT_ID;
  const dbId = env?.CLOUDFLARE_D1_DATABASE_ID || CLOUDFLARE_D1_DATABASE_ID;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql, params })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 REST query failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const queryResult = json.result?.[0] || {};
  return {
    results: queryResult.results || [],
    success: queryResult.success !== false,
    changes: queryResult.meta ? queryResult.meta.changes : 0
  };
}

export async function executeD1Run(env, sql, params = []) {
  if (env && env.DB && typeof env.DB.prepare === 'function') {
    try {
      const stmt = env.DB.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const res = await bound.run();
      return {
        success: res.success !== false,
        changes: res.meta ? res.meta.changes : 0
      };
    } catch (err) {
      console.error("[D1_RUN_WORKER_ERROR]", err);
      throw err;
    }
  }
  return executeD1Query(env, sql, params);
}
