import { User } from "firebase/auth";
import { deriveKey, generateSalt, decryptData } from "../../utils/crypto";
import { wrapVaultKey, unwrapVaultKey } from "../../utils/fileCrypto";
import { saveKeyToLocal } from "../../utils/db";
import { signVaultData } from "../../utils/integrity";
import {
  fetchVaultConfigApi,
  updateVaultSettingsApi,
  opaqueRegisterInitApi,
  opaqueRegisterFinishApi
} from "../../services/vaultApiService";
import * as opaque from "@serenity-kit/opaque";

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

  // Recupera dados do cofre do cache local ou D1
  let data: any = null;
  const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
  if (cachedData) {
    try {
      data = JSON.parse(cachedData);
    } catch (e) {}
  }

  if (!data || !data.salt) {
    try {
      data = await fetchVaultConfigApi(user);
    } catch (err) {
      console.warn("Falha ao buscar dados remotos do usuário para troca de PIN:", err);
    }
  }

  if (!data || !data.salt) {
    throw new Error("Dados de configuração do cofre não encontrados");
  }

  // Validação estrita do PIN atual
  const currentSalt = data.salt;
  const currentKek = await deriveKey(currentPin, currentSalt, true);

  // Testa o PIN atual tentando desembrulhar a chave ou via verificação legada
  let vmk = cryptoKey;
  if (data.encryptedVaultKey && data.encryptedVaultKey.ciphertext && data.encryptedVaultKey.iv) {
    try {
      vmk = await unwrapVaultKey(data.encryptedVaultKey, currentKek);
    } catch (unwrapErr) {
      throw new Error("Senha atual do cofre incorreta");
    }
  } else if (data.verification) {
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
  }

  // Geração do novo Salt e nova KEK a partir do novo PIN
  const newSalt = await generateSalt();
  const newKek = await deriveKey(newPin, newSalt, true);

  // Novo envelope criptográfico da MESMA VMK (zero re-upload / zero alteração nos arquivos)
  const newEncryptedVaultKey = await wrapVaultKey(vmk, newKek);

  // Sincronização OPAQUE e D1 com o servidor se online
  let registrationRecord: string | null = null;
  if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
    try {
      await opaque.ready;
      const regInit = opaque.client.startRegistration({ password: newPin });
      const regRes = await opaqueRegisterInitApi(user, regInit.registrationRequest);
      if (regRes && regRes.registrationResponse) {
        const regFinish = opaque.client.finishRegistration({
          password: newPin,
          registrationResponse: regRes.registrationResponse,
          clientRegistrationState: regInit.clientRegistrationState
        });
        registrationRecord = regFinish.registrationRecord;

        await opaqueRegisterFinishApi(user, {
          registrationRecord,
          encryptedVaultKey: newEncryptedVaultKey,
          salt: newSalt,
          encryptionMode: data.encryptionMode || "standard",
          extraPassword: data.extraPassword,
          extraPasswordUpdatedAt: data.extraPasswordUpdatedAt || 0
        });
      }
    } catch (opaqueErr) {
      console.warn("[CHANGE_PIN] Falha ao sincronizar OPAQUE no servidor:", opaqueErr);
      // Fallback para updateVaultSettings padrão
      await updateVaultSettingsApi(user, {
        salt: newSalt,
        encryptedVaultKey: newEncryptedVaultKey,
        keyWrappingVersion: 1
      }).catch(() => {});
    }
  }

  // Atualização do cache local (sem string de verificação em texto plano)
  const initialSig = await signVaultData(user.uid, 0, null);
  data.vaultVersion = 2;
  data.salt = newSalt;
  data.verification = null;
  data.encryptedVaultKey = newEncryptedVaultKey;
  data.keyWrappingVersion = 1;
  data.integritySignature = initialSig;
  localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));

  // Preserva a mesma VMK no armazenamento local e no estado do React
  await saveKeyToLocal(user.uid, vmk);
  setCryptoKey(vmk);
}
