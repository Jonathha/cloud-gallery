const ACCOUNT_ID = "5f6bf92f4e3155e3abad118e68e648c5";
const DATABASE_ID = "6ae4e9aa-767b-45f5-825f-83211cf32308";

function getApiToken(env) {
  const token = env?.CHAT_GLOBAL_D1_API_TOKEN || env?.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("Token da API do D1 do chat não configurado (CHAT_GLOBAL_D1_API_TOKEN).");
  return token;
}

export async function d1Query(sql, params = [], env) {
  const accountId = env?.CLOUDFLARE_ACCOUNT_ID || ACCOUNT_ID;
  const databaseId = env?.CLOUDFLARE_DATABASE_ID || env?.D1_DATABASE_ID || DATABASE_ID;
  const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const token = getApiToken(env);

  const res = await fetch(apiBase, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql, params })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false || data.errors?.length) {
    throw new Error(data.errors?.[0]?.message || `D1 API error (${res.status})`);
  }
  return data.result?.[0] || { results: [] };
}

// Executa várias consultas em uma única chamada HTTP (transação no D1).
// Retorna um resultado por consulta. Se a API rejeitar o lote, cai para o modo sequencial.
let batchUnsupported = false;

export async function d1Batch(statements, env) {
  if (batchUnsupported) {
    const seq = [];
    for (const stmt of statements) {
      seq.push(await d1Query(stmt.sql, stmt.params, env));
    }
    return seq;
  }

  const accountId = env?.CLOUDFLARE_ACCOUNT_ID || ACCOUNT_ID;
  const databaseId = env?.CLOUDFLARE_DATABASE_ID || env?.D1_DATABASE_ID || DATABASE_ID;
  const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const token = getApiToken(env);

  try {
    const res = await fetch(apiBase, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ batch: statements })
    });
    const data = await res.json().catch(() => ({}));
    if (
      res.ok &&
      data.success !== false &&
      !data.errors?.length &&
      Array.isArray(data.result) &&
      data.result.length === statements.length
    ) {
      return data.result;
    }
    // A API respondeu mas não aceitou o lote: não tenta de novo nesta instância
    if (res.status >= 400 && res.status < 500) batchUnsupported = true;
  } catch {
    // cai para o modo sequencial abaixo
  }

  const results = [];
  for (const stmt of statements) {
    results.push(await d1Query(stmt.sql, stmt.params, env));
  }
  return results;
}
