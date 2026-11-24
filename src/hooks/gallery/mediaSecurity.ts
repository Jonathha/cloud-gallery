import { deriveKey } from "../../utils/crypto";
import { fetchSecurityAuxKey } from "./decrypt/securityAuxKey";

export async function resolveSecurityKey(
  imgId: string, cryptoKey: CryptoKey,
  securityImageId?: string | null, isExtraUnlocked?: boolean, extraPassword?: string | null
): Promise<CryptoKey> {
  if (imgId !== securityImageId) return cryptoKey;
  if (!isExtraUnlocked || !extraPassword) throw new Error("Desbloqueie a pasta de segurança primeiro.");
  const auxKey = await fetchSecurityAuxKey(imgId);
  if (!auxKey) throw new Error("Chave auxiliar não encontrada.");
  const salt = btoa(auxKey.slice(0, 16).padEnd(16, "0"));
  return await deriveKey(extraPassword, salt);
}
