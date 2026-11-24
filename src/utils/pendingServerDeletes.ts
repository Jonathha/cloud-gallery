import { getApiUrl } from "./apiUrl";
import { getSafeAuthToken } from "./safeAuthToken";

// Fila local de exclusões que ainda não chegaram ao servidor (offline ou resposta com erro).
// Evita que a mídia volte para a galeria na próxima sincronização.
const keyFor = (uid: string) => `pending_server_deletes_v1_${uid}`;

export function getPendingServerDeletes(uid?: string | null): string[] {
  if (!uid) return [];
  try {
    const list = JSON.parse(localStorage.getItem(keyFor(uid)) || "[]");
    return Array.isArray(list) ? list.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function savePending(uid: string, ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(keyFor(uid), JSON.stringify(ids));
    else localStorage.removeItem(keyFor(uid));
  } catch {}
}

export function addPendingServerDelete(uid: string | null | undefined, id: string) {
  if (!uid) return;
  const list = getPendingServerDeletes(uid);
  if (!list.includes(id)) savePending(uid, [...list, id]);
}

export function removePendingServerDelete(uid: string | null | undefined, id: string) {
  if (!uid) return;
  const list = getPendingServerDeletes(uid);
  if (list.includes(id)) savePending(uid, list.filter((x) => x !== id));
}

let flushing: Promise<void> | null = null;

// Reenvia as exclusões pendentes. Restaurar da lixeira remove o ID da fila, então só enviamos
// o DELETE se o ID ainda estiver na fila no momento do envio.
export function flushPendingServerDeletes(user: { uid: string } | null | undefined, token?: string): Promise<void> {
  if (!user?.uid || !navigator.onLine) return Promise.resolve();
  if (flushing) return flushing;
  const uid = user.uid;
  const ids = getPendingServerDeletes(uid);
  if (!ids.length) return Promise.resolve();

  flushing = (async () => {
    let authToken = token;
    if (!authToken) {
      try { authToken = await getSafeAuthToken(user as any); } catch {}
    }
    for (const id of ids) {
      if (!getPendingServerDeletes(uid).includes(id)) continue;
      try {
        const res = await fetch(getApiUrl(`/api/storage/image/${id}`), {
          method: "DELETE",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        // 403: a mídia não é deste usuário, o reenvio nunca vai funcionar.
        if (res.ok || res.status === 403) removePendingServerDelete(uid, id);
      } catch {}
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
