import { getApiUrl } from "../../../../utils/apiUrl";

export async function fetchRemoteLists(user: any, token: string) {
  return fetch(getApiUrl(`/api/storage/images?userId=${user.uid}`), {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then((res) => (res.ok ? res.json() : null)).catch(() => null);
}

// Versão de sincronização do servidor (não lê o D1). null = indisponível: o chamador baixa a lista normalmente.
export async function fetchRemoteVersion(user: any, token: string): Promise<string | null> {
  return fetch(getApiUrl(`/api/storage/version?userId=${user.uid}`), {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then((res) => (res.ok ? res.json() : null)).then((d) => (d && d.version != null ? String(d.version) : null)).catch(() => null);
}
