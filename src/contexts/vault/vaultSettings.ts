import { User } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { deriveKey, encryptData, decryptData } from "../../utils/crypto";
import {
  generateFileKey,
  encryptWithFileKey,
  encryptFileKey,
  decryptWithFileKey,
  decryptFileKey,
} from "../../utils/fileCrypto";
import {
  removeImageFromCache,
  saveAuxKeyToCache,
  removeAuxKeyFromCache,
} from "../../utils/db";
import { getApiUrl } from "../../utils/apiUrl";

export async function updateExtraPasswordLogic(
  password: string,
  user: User,
  cryptoKey: CryptoKey,
  setExtraPassword: (pwd: string | null) => void
) {
  try {
    const encrypted = await encryptData(password, cryptoKey);
    const now = Date.now();

    try {
      await setDoc(
        doc(dbPrimary, "users", user.uid),
        {
          extraPassword: encrypted,
          extraPasswordUpdatedAt: now,
        },
        { merge: true }
      );
    } catch (error) {
      console.warn("Falha ao salvar senha extra na nuvem, salvando apenas localmente:", error);
    }

    setExtraPassword(password);

    const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      data.extraPassword = encrypted;
      data.extraPasswordUpdatedAt = now;
      localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Erro ao atualizar senha extra:", error);
  }
}

export async function setSecurityImageLogic(
  imageId: string | null,
  user: User,
  cryptoKey: CryptoKey,
  extraPassword: string | null,
  securityImageId: string | null,
  setSecurityImageId: (id: string | null) => void,
  customExtraPassword?: string
) {
  try {
    const now = Date.now();
    const currentExtraPassword = customExtraPassword || extraPassword;

    // If there is an existing protected image, revert it to normal encryption
    if (securityImageId && securityImageId !== imageId) {
      console.log("[setSecurityImage] Reverting old protected image:", securityImageId);
      try {
        const keyDoc = await getDoc(doc(dbPrimary, "media_keys", securityImageId));
        if (keyDoc.exists() && currentExtraPassword && cryptoKey) {
          const auxKey = keyDoc.data().auxKey;
          const salt = btoa(auxKey.slice(0, 16).padEnd(16, "0"));
          const combinedKey = await deriveKey(currentExtraPassword, salt);

          const imgRes = await fetch(getApiUrl(`/api/storage/image/${securityImageId}`));
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            if (imgData.success && imgData.image) {
              const fileData = imgData.image;
              if (fileData.ciphertext) {
                const originalBase64 = await decryptData(fileData.ciphertext, fileData.iv, combinedKey);

                let thumbBase64 = null;
                if (fileData.thumbnailCiphertext) {
                  thumbBase64 = await decryptData(fileData.thumbnailCiphertext, fileData.thumbnailIv, combinedKey);
                }

                const fileKey = generateFileKey();
                const normalEncrypted = await encryptWithFileKey(originalBase64, fileKey);
                let normalThumbEncrypted = null;
                let fileSalt = normalEncrypted.fileSalt;
                if (thumbBase64) {
                  normalThumbEncrypted = await encryptWithFileKey(thumbBase64, fileKey);
                  fileSalt = normalThumbEncrypted.fileSalt;
                }

                const encryptedKey = await encryptFileKey(fileKey, cryptoKey);

                const payload = {
                  id: securityImageId,
                  userId: user.uid,
                  ciphertext: normalEncrypted.ciphertext,
                  iv: normalEncrypted.iv,
                  contentType: fileData.contentType,
                  totalSize: fileData.totalSize,
                  thumbnailCiphertext: normalThumbEncrypted ? normalThumbEncrypted.ciphertext : "",
                  thumbnailIv: normalThumbEncrypted ? normalThumbEncrypted.iv : "",
                  fileKeyCiphertext: encryptedKey.ciphertext,
                  fileKeyIv: encryptedKey.iv,
                  fileSalt,
                  isChunked: fileData.isChunked || false,
                  chunkCount: fileData.chunkCount || 1,
                  isProtected: false,
                };

                const token = await user.getIdToken();
                await fetch(getApiUrl("/api/storage/upload"), {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                  },
                  body: JSON.stringify(payload),
                });
                await deleteDoc(doc(dbPrimary, "media_keys", securityImageId));
                await removeImageFromCache(securityImageId);
                try {
                  await removeAuxKeyFromCache(securityImageId);
                } catch (cacheErr) {
                  console.warn("Failed to remove cached aux key:", cacheErr);
                }
              }
            }
          }
        }
      } catch (revertErr) {
        console.error("Failed to revert previous protected image:", revertErr);
      }
    }

    // If a new imageId is provided, protect it with the secure flow
    if (imageId) {
      if (!currentExtraPassword) {
        throw new Error("Você precisa configurar uma Senha de Segurança nas Configurações primeiro.");
      }
      if (!cryptoKey) {
        throw new Error("Cofre bloqueado");
      }

      console.log("[setSecurityImage] Protecting new image:", imageId);
      const { generateAuxiliaryKey } = await import("../../utils/crypto");

      const auxKey = generateAuxiliaryKey();
      const salt = btoa(auxKey.slice(0, 16).padEnd(16, "0"));
      const combinedKey = await deriveKey(currentExtraPassword, salt);

      const imgRes = await fetch(getApiUrl(`/api/storage/image/${imageId}`));
      if (!imgRes.ok) throw new Error("Erro ao carregar a imagem original");
      const imgData = await imgRes.json();
      if (!imgData.success || !imgData.image) throw new Error("Dados da imagem inválidos");
      const fileData = imgData.image;

      let originalBase64 = "";
      if (fileData.fileKeyCiphertext && fileData.fileKeyIv && fileData.fileSalt) {
        try {
          const fileKeyStr = await decryptFileKey(fileData.fileKeyCiphertext, fileData.fileKeyIv, cryptoKey);
          originalBase64 = await decryptWithFileKey(fileData.ciphertext, fileData.iv, fileKeyStr, fileData.fileSalt);
        } catch (e) {
          originalBase64 = await decryptData(fileData.ciphertext, fileData.iv, cryptoKey);
        }
      } else {
        originalBase64 = await decryptData(fileData.ciphertext, fileData.iv, cryptoKey);
      }

      if (!originalBase64.startsWith('data:') && !originalBase64.startsWith('blob:')) {
        originalBase64 = `data:${fileData.contentType || "image/jpeg"};base64,${originalBase64}`;
      }

      let thumbBase64 = null;
      if (fileData.thumbnailCiphertext) {
        if (fileData.fileKeyCiphertext && fileData.fileKeyIv && fileData.fileSalt) {
          try {
            const fileKeyStr = await decryptFileKey(fileData.fileKeyCiphertext, fileData.fileKeyIv, cryptoKey);
            thumbBase64 = await decryptWithFileKey(fileData.thumbnailCiphertext, fileData.thumbnailIv, fileKeyStr, fileData.fileSalt);
          } catch (e) {
            thumbBase64 = await decryptData(fileData.thumbnailCiphertext, fileData.thumbnailIv, cryptoKey);
          }
        } else {
          thumbBase64 = await decryptData(fileData.thumbnailCiphertext, fileData.thumbnailIv, cryptoKey);
        }
      }

      const protectedEncrypted = await encryptData(originalBase64, combinedKey);
      let protectedThumbEncrypted = null;
      if (thumbBase64) {
        protectedThumbEncrypted = await encryptData(thumbBase64, combinedKey);
      }

      await setDoc(doc(dbPrimary, "media_keys", imageId), {
        userId: user.uid,
        auxKey,
        createdAt: now,
      });

      try {
        await saveAuxKeyToCache(imageId, auxKey);
      } catch (cacheErr) {
        console.warn("Failed to cache aux key locally:", cacheErr);
      }

      const payload = {
        id: imageId,
        userId: user.uid,
        ciphertext: protectedEncrypted.ciphertext,
        iv: protectedEncrypted.iv,
        contentType: fileData.contentType,
        totalSize: fileData.totalSize,
        thumbnailCiphertext: protectedThumbEncrypted ? protectedThumbEncrypted.ciphertext : "",
        thumbnailIv: protectedThumbEncrypted ? protectedThumbEncrypted.iv : "",
        isChunked: fileData.isChunked || false,
        chunkCount: fileData.chunkCount || 1,
        isProtected: true,
      };

      const token = await user.getIdToken();
      const uploadRes = await fetch(getApiUrl("/api/storage/upload"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!uploadRes.ok) throw new Error("Erro ao salvar imagem protegida");

      await removeImageFromCache(imageId);
    }

    try {
      await setDoc(
        doc(dbPrimary, "users", user.uid),
        {
          securityImageId: imageId,
          securityImageIdUpdatedAt: now,
        },
        { merge: true }
      );
    } catch (error) {
      console.warn("Falha ao salvar imagem protegida na nuvem, salvando apenas localmente:", error);
    }

    setSecurityImageId(imageId);

    const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      data.securityImageId = imageId;
      data.securityImageIdUpdatedAt = now;
      localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
    }

    window.dispatchEvent(new Event("refresh-gallery-list"));
  } catch (error) {
    console.error("Erro ao atualizar imagem protegida:", error);
    throw error;
  }
}

export async function switchEncryptionModeLogic(
  targetMode: 'standard' | 'custom_extra',
  newExtraPasswordInput: string | null,
  user: User,
  cryptoKey: CryptoKey,
  setExtraPassword: (pwd: string | null) => void,
  setEncryptionModeState?: (mode: 'standard' | 'custom_extra') => void
) {
  try {
    const now = Date.now();
    let encryptedExtra = null;
    let finalExtraPasswordValue: string | null = null;

    if (targetMode === 'custom_extra') {
      if (!newExtraPasswordInput || newExtraPasswordInput.trim().length === 0) {
        throw new Error("Digite uma senha extra válida para ativar o modo de proteção dupla.");
      }
      finalExtraPasswordValue = newExtraPasswordInput.trim();
      encryptedExtra = await encryptData(finalExtraPasswordValue, cryptoKey);
    } else {
      // Switch to standard mode
      finalExtraPasswordValue = null;
      encryptedExtra = null;
    }

    try {
      await setDoc(
        doc(dbPrimary, "users", user.uid),
        {
          encryptionMode: targetMode,
          extraPassword: encryptedExtra,
          extraPasswordUpdatedAt: now,
        },
        { merge: true }
      );
    } catch (error) {
      console.warn("Falha ao atualizar modo de criptografia na nuvem, aplicando localmente:", error);
    }

    setExtraPassword(finalExtraPasswordValue);
    if (setEncryptionModeState) {
      setEncryptionModeState(targetMode);
    }

    const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      data.encryptionMode = targetMode;
      data.extraPassword = encryptedExtra;
      data.extraPasswordUpdatedAt = now;
      localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Erro ao alterar modo de criptografia:", error);
    throw error;
  }
}
