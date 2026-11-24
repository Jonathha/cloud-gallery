/**
 * Utilitários de conversão e formato para configurações do cofre
 */
export function toCipherString(val: any): string {
  if (typeof val === 'string') return val;
  if (val instanceof Uint8Array) return btoa(String.fromCharCode(...val));
  if (val instanceof ArrayBuffer) return btoa(String.fromCharCode(...new Uint8Array(val)));
  return '';
}

/**
 * Atualiza o cache local de dados do cofre no localStorage
 */
export function updateLocalVaultCache(uid: string, patch: Record<string, any>): void {
  const cachedData = localStorage.getItem(`vault_data_${uid}`);
  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      Object.assign(data, patch);
      localStorage.setItem(`vault_data_${uid}`, JSON.stringify(data));
    } catch (e) {
      console.warn('[vaultSettings] Erro ao atualizar cache local:', e);
    }
  }
}

/**
 * Garante prefixo correto de dataUrl ou base64
 */
export function formatEncryptedImagePrefix(dataUrl: string, contentType = 'image/jpeg'): string {
  if (dataUrl.startsWith('data:') || dataUrl.startsWith('blob:')) return dataUrl;
  return `data:${contentType};base64,${dataUrl}`;
}
