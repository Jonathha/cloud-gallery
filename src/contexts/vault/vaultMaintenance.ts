import { User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { deriveKey, generateSalt, encryptData, decryptData } from "../../utils/crypto";
import { wrapVaultKey, unwrapVaultKey } from "../../utils/fileCrypto";
import { saveKeyToLocal } from "../../utils/db";

export async function changeVaultPinLogic(
  currentPin: string,
  newPin: string,
  user: User,
  cryptoKey: CryptoKey,
  _extraPassword: string | null,
  setCryptoKey: (key: CryptoKey | null) => void
) {
  if (!user) throw new Error("Usuário não autenticado");
  if (!cryptoKey) throw new Error("Cofre não está desbloqueado");

  // Garante autenticação ativa no Firebase
  const token = await user.getIdToken();
  if (!token) throw new Error("Não foi possível autenticar o usuário no Firebase");

  // Recupera dados do cofre do cache local ou Firestore
  let data: any = null;
  const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
  if (cachedData) {
    try {
      data = JSON.parse(cachedData);
    } catch (e) {}
  }

  if (!data || !data.salt || !data.verification) {
    try {
      const userDoc = await getDoc(doc(dbPrimary, "users", user.uid));
      if (userDoc && userDoc.exists()) {
        data = userDoc.data();
      }
    } catch (err) {
      console.warn("Falha ao buscar dados remotos do usuário para troca de PIN:", err);
    }
  }

  if (!data || !data.salt || !data.verification) {
    throw new Error("Dados de configuração do cofre não encontrados");
  }

  // Validação estrita do PIN atual
  const currentSalt = data.salt;
  const currentKek = await deriveKey(currentPin, currentSalt, true);

  try {
    const check = await decryptData(
      data.verification.ciphertext,
      data.verification.iv,
      currentKek
    );
    if (check !== "vault-check") {
      throw new Error("Senha atual do cofre incorreta");
    }
  } catch (e) {
    throw new Error("Senha atual do cofre incorreta");
  }

  // Obtenção garantida da Vault Master Key (VMK) ativa
  let vmk = cryptoKey;
  if (!vmk && data.encryptedVaultKey) {
    vmk = await unwrapVaultKey(data.encryptedVaultKey, currentKek);
  } else if (!vmk) {
    vmk = currentKek; // Fallback para usuário legado
  }

  // Geração da nova KEK a partir do novo PIN
  const newSalt = await generateSalt();
  const newKek = await deriveKey(newPin, newSalt, true);
  const newVerification = await encryptData("vault-check", newKek);

  // Novo envelope criptográfico da MESMA VMK (zero re-upload / zero alteração nos arquivos)
  const newEncryptedVaultKey = await wrapVaultKey(vmk, newKek);

  // Persistência atômica no Firestore /users/{uid}
  const updatePayload: any = {
    salt: newSalt,
    verification: newVerification,
    encryptedVaultKey: newEncryptedVaultKey,
    keyWrappingVersion: 1,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(dbPrimary, "users", user.uid), updatePayload, { merge: true });

  // Atualização do cache local
  data.salt = newSalt;
  data.verification = newVerification;
  data.encryptedVaultKey = newEncryptedVaultKey;
  data.keyWrappingVersion = 1;
  localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));

  // Preserva a mesma VMK no armazenamento local e no estado do React
  await saveKeyToLocal(user.uid, vmk);
  setCryptoKey(vmk);
}
