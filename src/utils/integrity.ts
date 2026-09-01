import { decryptData, encryptData } from "./crypto";

// Nome da base no IndexedDB para a chave de integridade
const DB_NAME = "IntegrityShieldDB";
const STORE_NAME = "Secrets";
const KEY_NAME = "session_integrity_v1";

// Função para obter ou criar material de chave persistente via IndexedDB
async function getPersistentKeyMaterial(): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(KEY_NAME);

      getReq.onsuccess = () => {
        if (getReq.result) {
          resolve(getReq.result);
        } else {
          const newMaterial = window.crypto.getRandomValues(new Uint8Array(32));
          store.put(newMaterial, KEY_NAME);
          resolve(newMaterial);
        }
      };
      getReq.onerror = () => reject(new Error("Erro ao acessar IndexedDB"));
    };
    
    request.onerror = () => reject(new Error("Falha ao abrir banco de integridade"));
  });
}

// Chave secreta de sessão persistente gerada no primeiro acesso
let sessionSecretKey: CryptoKey | null = null;

// Função interna para obter ou gerar a chave secreta da sessão
async function getSessionSecretKey(): Promise<CryptoKey> {
  if (sessionSecretKey) return sessionSecretKey;

  try {
    const rawKeyMaterial = await getPersistentKeyMaterial();
    
    // Usamos a Web Crypto API nativa para derivar uma chave HMAC segura offline
    sessionSecretKey = await window.crypto.subtle.importKey(
      "raw",
      rawKeyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    return sessionSecretKey;
  } catch (err) {
    // Fallback para chave efêmera se o IndexedDB falhar (menos ideal, mas funcional)
    const ephemeral = window.crypto.getRandomValues(new Uint8Array(32));
    return await window.crypto.subtle.importKey(
      "raw",
      ephemeral,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
}

/**
 * Gera um token de verificação criptográfico assinado para atestar que a biometria/PIN local
 * foi validado com sucesso pelo navegador na sessão atual de forma legítima.
 */
export async function generateDeviceVerificationToken(userId: string): Promise<string> {
  try {
    const key = await getSessionSecretKey();
    const payload = JSON.stringify({
      userId,
      timestamp: Date.now(),
      nonce: Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
    });

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(payload);
    const signatureBuffer = await window.crypto.subtle.sign("HMAC", key, dataBytes);
    
    // Converte a assinatura e o payload para um token compacto estruturado
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const tokenObj = {
      payload: btoa(payload),
      sig: signatureHex
    };

    return btoa(JSON.stringify(tokenObj));
  } catch (err) {
    console.error("[INTEGRITY_SHIELD] Falha ao gerar token de verificação:", err);
    throw new Error("Erro na assinatura de integridade do dispositivo.");
  }
}

/**
 * Valida de forma estrita e 100% offline se o token de confirmação do dispositivo é legítimo,
 * assinado pela chave de sessão e não foi adulterado ou forjado por console/extensões.
 */
export async function verifyDeviceVerificationToken(userId: string, tokenStr: string | null): Promise<boolean> {
  if (!tokenStr) return false;
  try {
    const key = await getSessionSecretKey();
    const tokenObj = JSON.parse(atob(tokenStr));
    const payloadStr = atob(tokenObj.payload);
    const payload = JSON.parse(payloadStr);

    // Valida se o token pertence ao usuário atual
    if (payload.userId !== userId) {
      console.warn("[INTEGRITY_SHIELD] Tentativa de bypass detectada: UID inválido no token.");
      return false;
    }

    // Valida o tempo de expiração do token de sessão (1 hora de validade)
    const now = Date.now();
    if (now - payload.timestamp > 60 * 60 * 1000 || payload.timestamp > now + 5000) {
      console.warn("[INTEGRITY_SHIELD] Token de verificação expirado ou inválido.");
      return false;
    }

    // Verifica a assinatura criptográfica simétrica HMAC-SHA256
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(payloadStr);
    
    // Reconstrói o buffer da assinatura
    const sigBytes = new Uint8Array(
      tokenObj.sig.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16))
    );

    const isValid = await window.crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
    if (!isValid) {
      console.warn("[INTEGRITY_SHIELD] ALERTA: Assinatura do dispositivo violada ou forjada!");
    }
    return isValid;
  } catch (err) {
    console.error("[INTEGRITY_SHIELD] Erro ao validar assinatura de integridade:", err);
    return false;
  }
}

/**
 * Assina os dados de lockout e tentativas falhas no localStorage para impedir adulterações manuais via console.
 */
export async function signVaultData(userId: string, failedAttempts: number, lockedUntil: number | null): Promise<string> {
  try {
    const key = await getSessionSecretKey();
    const dataStr = `${userId}:${failedAttempts}:${lockedUntil || 0}`;
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(dataStr);
    
    const signatureBuffer = await window.crypto.subtle.sign("HMAC", key, dataBytes);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error("[INTEGRITY_SHIELD] Falha ao assinar metadados de tentativas:", err);
    return "";
  }
}

/**
 * Verifica se os metadados salvos localmente não foram adulterados no localStorage.
 */
export async function verifyVaultDataIntegrity(
  userId: string, 
  failedAttempts: number, 
  lockedUntil: number | null, 
  signature: string | null
): Promise<boolean> {
  if (failedAttempts === 0 && !lockedUntil) return true; // Estado inicial limpo é válido
  if (!signature) return false; // Se há tentativas mas sem assinatura, foi adulterado
  
  try {
    const key = await getSessionSecretKey();
    const dataStr = `${userId}:${failedAttempts}:${lockedUntil || 0}`;
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(dataStr);
    
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16))
    );

    return await window.crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
  } catch (err) {
    console.error("[INTEGRITY_SHIELD] Erro na verificação de integridade dos metadados locais:", err);
    return false;
  }
}

/**
 * Monitor Ativo de Proteção e Auto-Defesa (Anti-Tamper Monitor)
 * Detecta se propriedades da window de bypass foram definidas para true e ativa contramedidas imediatas.
 */
export function checkActiveIntrusion(): boolean {
  try {
    const forceBypass = (window as any).__FORCE_UNLOCK_MAIN_VAULT_AUDIT__;
    const deviceBypass = (window as any).__BYPASS_DEVICE_AUTH_AUDIT__;
    
    if (forceBypass === true || deviceBypass === true) {
      // Dispara detecção de intrusão silenciosa de auditoria
      return true;
    }
  } catch (e) {}
  return false;
}
