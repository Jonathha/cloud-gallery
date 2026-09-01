import { useEffect } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { dbPrimary } from "../firebase";
import { encryptData } from "../utils/crypto";

export function useExtraPasswordSync(
  user: User | null,
  cryptoKey: CryptoKey | null,
  setOrDecryptExtraPassword: (extraVal: any, key: CryptoKey | null) => Promise<void>,
  setSecurityImageId: (id: string | null) => void
) {
  useEffect(() => {
    const decryptStoredExtraPassword = async () => {
      if (!user || !cryptoKey) {
        setOrDecryptExtraPassword(null, null);
        return;
      }
      try {
        // 1. Carregar do cache local primeiro para resposta visual instantânea
        const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
        let currentLocalData: any = null;
        if (cachedData) {
          currentLocalData = JSON.parse(cachedData);
          await setOrDecryptExtraPassword(currentLocalData.extraPassword, cryptoKey);
          setSecurityImageId(currentLocalData.securityImageId || null);
        }

        // 2. Sincronização em segundo plano com o Firestore (com cryptoKey válido!)
        try {
          const userDoc = await getDoc(doc(dbPrimary, "users", user.uid));
          if (userDoc.exists()) {
            const freshData = userDoc.data();
            
            // Se não houver dados locais, criamos um esqueleto
            const localData = currentLocalData || {
              salt: freshData.salt,
              verification: freshData.verification,
              encryptedVaultKey: freshData.encryptedVaultKey || null,
              keyWrappingVersion: freshData.keyWrappingVersion || null,
              extraPassword: null,
              securityImageId: null,
              extraPasswordUpdatedAt: 0,
              securityImageIdUpdatedAt: 0,
              failedAttempts: 0,
              lockedUntil: null,
            };

            let shouldUpdateExtraPassword = true;
            let shouldUpdateSecurityImage = true;

            const localExtraPasswordUpdatedAt = localData.extraPasswordUpdatedAt || 0;
            const remoteExtraPasswordUpdatedAt = freshData.extraPasswordUpdatedAt || 0;

            if (localExtraPasswordUpdatedAt > remoteExtraPasswordUpdatedAt) {
              shouldUpdateExtraPassword = false;
              console.log("[AuthContext] Mantendo senha extra local pois é mais recente que a da nuvem");
            }

            const localSecurityImageIdUpdatedAt = localData.securityImageIdUpdatedAt || 0;
            const remoteSecurityImageIdUpdatedAt = freshData.securityImageIdUpdatedAt || 0;

            if (localSecurityImageIdUpdatedAt > remoteSecurityImageIdUpdatedAt) {
              shouldUpdateSecurityImage = false;
              console.log("[AuthContext] Mantendo imagem de segurança local pois é mais recente que a da nuvem");
            }

            const finalExtraPassword = shouldUpdateExtraPassword ? freshData.extraPassword : localData.extraPassword;
            const finalSecurityImageId = shouldUpdateSecurityImage ? (freshData.securityImageId || null) : (localData.securityImageId || null);

            const finalExtraPasswordUpdatedAt = shouldUpdateExtraPassword ? (freshData.extraPasswordUpdatedAt || 0) : localExtraPasswordUpdatedAt;
            const finalSecurityImageIdUpdatedAt = shouldUpdateSecurityImage ? (freshData.securityImageIdUpdatedAt || 0) : localSecurityImageIdUpdatedAt;

            // Decodifica a senha final com a chave segura ativa
            await setOrDecryptExtraPassword(finalExtraPassword, cryptoKey);
            setSecurityImageId(finalSecurityImageId);

            // Grava o cache local atualizado e sincronizado
            localStorage.setItem(
              `vault_data_${user.uid}`,
              JSON.stringify({
                salt: freshData.salt,
                verification: freshData.verification,
                encryptedVaultKey: freshData.encryptedVaultKey || localData.encryptedVaultKey || null,
                keyWrappingVersion: freshData.keyWrappingVersion || localData.keyWrappingVersion || null,
                extraPassword: finalExtraPassword,
                securityImageId: finalSecurityImageId,
                extraPasswordUpdatedAt: finalExtraPasswordUpdatedAt,
                securityImageIdUpdatedAt: finalSecurityImageIdUpdatedAt,
                failedAttempts: freshData.failedAttempts || localData.failedAttempts || 0,
                lockedUntil: freshData.lockedUntil || localData.lockedUntil || null,
              }),
            );
          }
        } catch (onlineErr) {
          console.warn("[AuthContext] Falha ao sincronizar dados do cofre online:", onlineErr);
        }

        // Migração de strings legadas para objetos criptografados se necessário
        if (currentLocalData && typeof currentLocalData.extraPassword === "string" && currentLocalData.extraPassword) {
          try {
            const now = Date.now();
            const encrypted = await encryptData(currentLocalData.extraPassword, cryptoKey);
            await setDoc(doc(dbPrimary, "users", user.uid), { 
              extraPassword: encrypted,
              extraPasswordUpdatedAt: now
            }, { merge: true });
            
            const updatedCache = localStorage.getItem(`vault_data_${user.uid}`);
            if (updatedCache) {
              const uData = JSON.parse(updatedCache);
              uData.extraPassword = encrypted;
              uData.extraPasswordUpdatedAt = now;
              localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(uData));
            }
          } catch (err) {
            console.warn("Falha ao migrar senha secundária na inicialização:", err);
          }
        }
      } catch (error) {
        console.error("Erro ao decifrar a senha secundária:", error);
        setOrDecryptExtraPassword(null, null);
      }
    };
    decryptStoredExtraPassword();
  }, [cryptoKey, user]);
}
