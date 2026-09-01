import React, { useState, useEffect, useRef } from 'react';
import { importKeyFromBase64, decryptData, deriveKey } from '../utils/crypto';
import { useDevToolsBlocker } from './useDevToolsBlocker';
import { base64ToBlobUrl } from '../utils/shareHelpers';
import { getApiUrl } from '../utils/apiUrl';

export function usePublicShareLogic() {
  const [shareId, setShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareData, setShareData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [isDownloadingChunks, setIsDownloadingChunks] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const timerRef = useRef<any>(null);
  const blobUrlRef = useRef<string | null>(null);
  const e2eeKeyRef = useRef<string | null>(null);

  useDevToolsBlocker(blobUrlRef, setDecryptedUrl, setError);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('share');

    // Extrai a chave E2EE imediatamente a partir do fragmento/hash antes de limpar a URL
    let keyHash = window.location.hash.substring(1);
    if (keyHash) {
      try {
        keyHash = decodeURIComponent(keyHash);
      } catch (e) {}
    }
    
    if (keyHash) {
      keyHash = keyHash.trim().replace(/ /g, '+');
      keyHash = keyHash.replace(/-/g, '+').replace(/_/g, '/');
      e2eeKeyRef.current = keyHash;
    }

    // Limpa o hash da URL imediatamente para evitar vazamento na barra de enderecos e historico do navegador
    if (id) {
      const cleanUrl = window.location.origin + window.location.pathname + `?share=${id}`;
      window.history.replaceState(null, '', cleanUrl);
    }

    if (id) {
      setShareId(id);
      fetchShareConfig(id);
    } else {
      setError('ID de compartilhamento inválido.');
      setLoading(false);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const fetchShareConfig = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      let clientIp = '0.0.0.0';
      try {
        const ipRes = await fetch(getApiUrl('/api/ip'));
        const ipData = await ipRes.json();
        clientIp = ipData.ip || '0.0.0.0';
      } catch (ipErr) {
        console.warn('Erro ao carregar o IP do cliente:', ipErr);
      }

      let data: any = null;
      let firstViewedTime = null;
      
      try {
        const res = await fetch(getApiUrl(`/api/share/view/${id}`));
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.share) {
            data = resData.share;
            const now = Date.now();
            const expiresAtMillis = data.options?.expiresAt ? Number(data.options.expiresAt) : null;
            if (expiresAtMillis && now > expiresAtMillis) {
              throw new Error('Este link de compartilhamento expirou (limite de 1 hora).');
            }
            if (data.options?.oneTimeView) {
              if (data.firstViewedAt) {
                const viewedAtMillis = Number(data.firstViewedAt);
                firstViewedTime = viewedAtMillis;
                const secondsElapsed = (now - viewedAtMillis) / 1000;
                if (secondsElapsed > 60) {
                  throw new Error('Esta visualização única expirou. O limite de 1 minuto foi atingido.');
                }
                if (data.firstViewerIp && data.firstViewerIp !== clientIp) {
                  throw new Error('Acesso bloqueado: Este link de visualização única está travado no dispositivo inicial.');
                }
              }
            }
          } else if (resData.error) {
            throw new Error(resData.error);
          }
        } else {
          throw new Error('Link de compartilhamento inválido ou já expirado.');
        }
      } catch (serverErr: any) {
        console.warn('Erro ao carregar o compartilhamento pelo servidor:', serverErr);
        throw serverErr;
      }

      if (!data) {
        throw new Error('Link de compartilhamento inválido ou já expirado.');
      }

      const compositeShareData = {
        ...data,
        firstViewedAt: firstViewedTime,
        clientIp: clientIp
      };

      setShareData(compositeShareData);

      if (!data.options?.requirePassword) {
        const keyHash = e2eeKeyRef.current;
        if (!keyHash) {
          throw new Error('Chave de criptografia ausente ou já consumida da URL.');
        }
        try {
          await doDecryption(data, keyHash, id);
        } catch (decErr) {
          console.error(decErr);
          throw new Error('Falha ao descriptografar a imagem usando a chave fornecida.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar link de compartilhamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shareData?.options?.oneTimeView && shareData?.firstViewedAt && decryptedUrl) {
      const startTime = shareData.firstViewedAt;
      
      const updateTimer = () => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const remaining = 60 - elapsedSeconds;
        
        if (remaining <= 0) {
          setTimeLeft(0);
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
          }
          setDecryptedUrl(null);
          setError('Esta imagem de visualização única expirou (limite de 1 minuto atingido).');
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setTimeLeft(remaining);
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [shareData, decryptedUrl]);

  const doDecryption = async (data: any, rawKeyBase64: string, currentShareId: string) => {
    setError('');
    let sanitizedKey = rawKeyBase64.trim().replace(/ /g, '+');
    sanitizedKey = sanitizedKey.replace(/-/g, '+').replace(/_/g, '/');
    const importedKey = await importKeyFromBase64(sanitizedKey);

    const decryptedStr = await decryptData(data.ciphertext, data.iv, importedKey);
    const blobUrl = base64ToBlobUrl(decryptedStr, blobUrlRef);
    setDecryptedUrl(blobUrl);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError('');
    setDecrypting(true);

    try {
      const encryptedShareKeyStr = shareData.options?.encryptedShareKey;
      if (!encryptedShareKeyStr) throw new Error('Chave de compartilhamento ausente');
      const [encryptedShareKey, salt] = encryptedShareKeyStr.split('|');
      const ivShareKey = shareData.options?.ivShareKey;

      const derived = await deriveKey(password, salt);
      const decryptedShareKeyBase64 = await decryptData(encryptedShareKey, ivShareKey, derived);
      
      await doDecryption(shareData, decryptedShareKeyBase64, shareData.id);
    } catch (decErr) {
      console.error(decErr);
      setError('Senha incorreta de acesso ou arquivo corrompido. Tente novamente.');
    } finally {
      setDecrypting(false);
    }
  };

  return {
    shareId,
    loading,
    error,
    shareData,
    password,
    setPassword,
    decrypting,
    decryptedUrl,
    downloadProgress,
    isDownloadingChunks,
    timeLeft,
    handlePasswordSubmit,
  };
}
