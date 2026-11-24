/**
 * Versão de sincronização por usuário (Durable Object) + presença online do Chat Global.
 * Sobe a cada escrita de metadados; o cliente compara com a que já sincronizou
 * e só baixa a lista (leitura no D1) quando a versão mudou.
 */
const PRESENCE_TTL_MS = 25_000;
const CHAT_PRESENCE_KEY = "__chat_global_presence__";

export class UserSync {
  constructor(state) {
    this.state = state;
    this.presence = new Map();
  }

  prunePresence(now = Date.now()) {
    for (const [uid, entry] of this.presence.entries()) {
      if (!entry || (now - (entry.lastSeen || 0)) > PRESENCE_TTL_MS) {
        this.presence.delete(uid);
      }
    }
  }

  buildPresenceList() {
    const users = Array.from(this.presence.values())
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
      .map(({ userId, userName }) => ({ userId, userName }));
    return { count: users.length, users };
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;

    if (path === "/presence-ping") {
      const now = Date.now();
      const body = await request.json().catch(() => ({}));
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const userName = typeof body.userName === "string" ? body.userName.trim() : "";
      if (userId && userName) {
        this.presence.set(userId, { userId, userName, lastSeen: now });
      }
      this.prunePresence(now);
      return new Response(JSON.stringify(this.buildPresenceList()), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/presence-list") {
      this.prunePresence(Date.now());
      return new Response(JSON.stringify(this.buildPresenceList()), {
        headers: { "Content-Type": "application/json" },
      });
    }

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
const lastPingByUser = new Map();

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

/** Atualiza presença online do usuário dentro do Chat Global. */
export async function pingChatPresence(userId, userName, force = false) {
  if (!namespace || !userId || !userName) return;
  const now = Date.now();
  const prev = lastPingByUser.get(userId);
  if (!force && prev && prev.userName === userName && (now - prev.at) < 5000) {
    return;
  }
  lastPingByUser.set(userId, { userName, at: now });
  try {
    const stub = namespace.get(namespace.idFromName(CHAT_PRESENCE_KEY));
    await stub.fetch("https://user-sync/presence-ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userName })
    });
  } catch {
    // Silencioso
  }
}

/** Retorna { count, users: [{ userId, userName }] } dos usuários online no Chat Global agora. */
export async function getChatPresence() {
  if (!namespace) return { count: 0, users: [] };
  try {
    const stub = namespace.get(namespace.idFromName(CHAT_PRESENCE_KEY));
    const res = await stub.fetch("https://user-sync/presence-list");
    const data = await res.json();
    if (data && Array.isArray(data.users)) {
      return { count: Number(data.count) || data.users.length, users: data.users };
    }
  } catch {
    // Silencioso
  }
  return { count: 0, users: [] };
}
