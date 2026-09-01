export async function resolveSecurityKey(
  imgId: string,
  cryptoKey: CryptoKey,
  securityImageId?: string | null,
  isExtraUnlocked?: boolean,
  extraPassword?: string | null
): Promise<CryptoKey> {
  let activeKey = cryptoKey;
  if (imgId === securityImageId) {
    if (!isExtraUnlocked || !extraPassword) {
      throw new Error("Você precisa desbloquear a pasta de segurança primeiro.");
    }
    const { getAuxKeyFromCache, saveAuxKeyToCache } = await import("../../utils/db");
    let auxKey = await getAuxKeyFromCache(imgId);
    if (!auxKey) {
      const { doc, getDoc } = await import("firebase/firestore");
      const { dbPrimary } = await import("../../firebase");
      const docSnap = await getDoc(doc(dbPrimary, "media_keys", imgId));
      if (docSnap.exists()) {
        auxKey = docSnap.data().auxKey;
        if (auxKey) {
          await saveAuxKeyToCache(imgId, auxKey);
        }
      }
    }
    if (auxKey) {
      const { deriveKey } = await import("../../utils/crypto");
      const salt = btoa(auxKey.slice(0, 16).padEnd(16, "0"));
      activeKey = await deriveKey(extraPassword, salt);
    } else {
      throw new Error("Chave auxiliar não encontrada.");
    }
  }
  return activeKey;
}
