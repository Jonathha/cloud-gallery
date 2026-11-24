/**
 * Versão de sincronização por usuário (Durable Object).
 * Sobe a cada escrita de metadados; o cliente compara com a que já sincronizou
 * e só baixa a lista (leitura no D1) quando a versão mudou.
 */
export class UserSync {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    let version = (await this.state.storage.get("v")) || 0;
    if (path === "/bump") {
      // Monotônica e baseada no relógio: mesmo se o armazenamento for recriado, não repete valores antigos
      version = Math.max(version + 1, Date.now());
      await this.state.storage.put("v", version);
    }
    return new Response(JSON.stringify({ version: String(version) }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

let namespace = null;

export function setUserSyncNamespace(binding) {
  namespace = binding || null;
}

async function callUserSync(userId, action) {
  const stub = namespace.get(namespace.idFromName(userId));
  const res = await stub.fetch(`https://user-sync/${action}`);
  const data = await res.json();
  return data?.version ?? null;
}

/** Versão atual do usuário, ou null se o recurso não estiver disponível (o cliente então baixa a lista). */
export async function getUserVersion(userId) {
  if (!namespace || !userId) return null;
  try {
    return await callUserSync(userId, "get");
  } catch {
    return null;
  }
}

/** Marca que os metadados do usuário mudaram. Tenta duas vezes para não perder a notificação. */
export async function bumpUserVersion(userId) {
  if (!namespace || !userId) return;
  for (let i = 0; i < 2; i++) {
    try {
      await callUserSync(userId, "bump");
      return;
    } catch {}
  }
}
