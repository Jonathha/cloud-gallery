import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { packEncryptedFile } from '../../utils/fileCrypto';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, X, Lock } from 'lucide-react';
import { removeImageFromCache } from '../../utils/db';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { getSafeAuthToken } from '../../utils/safeAuthToken';

interface MigrationOverlayProps {
  migrationItems: any[];
  onComplete: (cancelled?: boolean) => void;
}

export default function MigrationOverlay({ migrationItems, onComplete }: MigrationOverlayProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'validating' | 'uploading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const count = migrationItems.length;
  const isSingle = count === 1;

  const handleStartMigration = async () => {
    if (!user) return;
    try {
      setStatus('validating');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStatus('uploading');
      let uploaded = 0;
      
      const token = await getSafeAuthToken(user);
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      for (const item of migrationItems) {
        const metadata = {
          id: item.id,
          userId: user.uid,
          iv: item.iv,
          contentType: item.contentType || "image/png",
          totalSize: item.totalSize || 0,
          isChunked: item.isChunked || false,
          chunkCount: item.chunkCount || 1,
          thumbnailCiphertext: item.thumbnailCiphertext,
          thumbnailIv: item.thumbnailIv,
          fileKeyCiphertext: item.fileKeyCiphertext,
          fileKeyIv: item.fileKeyIv,
          fileSalt: item.fileSalt,
          createdAt: item.createdAt
        };
        
        let validCiphertext = item.ciphertext;
        if (!validCiphertext || validCiphertext === "chunked_vault_data") {
          validCiphertext = btoa("chunked_vault_data");
        }
        
        validCiphertext = validCiphertext.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
        while (validCiphertext.length % 4 !== 0) {
          validCiphertext += '=';
        }
        
        const binaryBody = packEncryptedFile(metadata, validCiphertext);
        
        const apiBase = getApiBaseUrl();
        let uploadRes: Response | null = null;
        try {
          uploadRes = await fetch(`${apiBase}/api/storage/upload`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/octet-stream',
              'Authorization': `Bearer ${token}`
            },
            body: binaryBody
          });
        } catch (err) {
          console.warn("Primary upload failed in migration:", err);
        }

        if ((!uploadRes || !uploadRes.ok) && apiBase !== "https://secure-vault-backend.jogonesteterp.workers.dev") {
          const fallbackWorkerUrl = "https://secure-vault-backend.jogonesteterp.workers.dev";
          try {
            uploadRes = await fetch(`${fallbackWorkerUrl}/api/storage/upload`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/octet-stream',
                'Authorization': `Bearer ${token}`
              },
              body: binaryBody
            });
          } catch (fallbackErr) {
            console.warn("Fallback worker upload failed in migration:", fallbackErr);
          }
        }
        
        if (!uploadRes || !uploadRes.ok) {
          const errData = uploadRes ? await uploadRes.json().catch(() => ({})) : {};
          throw new Error(errData.error || 'Erro na resposta do servidor de upload');
        }

        uploaded++;
        setProgress(Math.round((uploaded / migrationItems.length) * 100));
      }
      
      setStatus('completed');
      
      for (const item of migrationItems) {
        await removeImageFromCache(item.id);
      }

      setTimeout(() => {
        onComplete();
      }, 1200);
      
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Erro desconhecido');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 selection:bg-white/20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] relative overflow-hidden"
      >
        {status === 'idle' && (
          <button
            onClick={() => onComplete(true)}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-100 shadow-inner">
            <Lock className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              Sincronização Segura Necessária
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Detectamos {count} {isSingle ? 'mídia' : 'mídias'} no seu dispositivo que {isSingle ? 'precisa' : 'precisam'} ser sincronizadas com o servidor.
            </p>
          </div>

          <div className="w-full bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06] text-left space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Informações de Segurança
              </h3>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.03]">
                <span className="text-zinc-500">Criptografia:</span>
                <span className="text-zinc-200 font-mono text-[11px]">AES-GCM (256-bit)</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.03]">
                <span className="text-zinc-500">Derivação de Chave:</span>
                <span className="text-zinc-200 font-mono text-[11px]">PBKDF2-HMAC-SHA256</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.03]">
                <span className="text-zinc-500">Isolamento:</span>
                <span className="text-zinc-200">Chave exclusiva por arquivo</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500">Data da Operação:</span>
                <span className="text-zinc-300">{new Date().toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div className="w-full bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06] space-y-3">
            <div className="flex items-center text-xs sm:text-sm text-left">
              {status === 'idle' ? (
                <ShieldCheck className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
              ) : status === 'validating' ? (
                <Loader2 className="w-4 h-4 text-white animate-spin mr-2.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2.5 shrink-0" />
              )}
              <span className={status === 'validating' ? 'text-white font-medium' : 'text-zinc-400'}>
                Validando {count} {isSingle ? 'arquivo local' : 'arquivos locais'}
              </span>
            </div>

            <div className="flex items-center text-xs sm:text-sm text-left">
              {status === 'uploading' ? (
                <Loader2 className="w-4 h-4 text-white animate-spin mr-2.5 shrink-0" />
              ) : status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-zinc-600 mr-2.5 shrink-0" />
              )}
              <span className={status === 'uploading' ? 'text-white font-medium' : status === 'completed' ? 'text-zinc-300' : 'text-zinc-500'}>
                Enviando dados ({progress}%)
              </span>
            </div>

            {status === 'uploading' && (
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                <motion.div 
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-start text-xs sm:text-sm text-red-400 mt-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-left">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {status === 'idle' && (
            <div className="w-full space-y-2 pt-1">
              <button 
                onClick={handleStartMigration}
                className="w-full h-11 sm:h-12 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all duration-200 shadow-md cursor-pointer text-sm"
              >
                Iniciar Sincronização
              </button>
              <button 
                onClick={() => onComplete(true)}
                className="w-full h-10 sm:h-11 bg-transparent text-zinc-400 font-medium rounded-xl hover:text-white hover:bg-white/5 active:scale-[0.98] transition-all duration-200 cursor-pointer text-sm"
              >
                Cancelar
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="w-full space-y-2 pt-1">
              <button 
                onClick={handleStartMigration}
                className="w-full h-11 sm:h-12 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all duration-200 shadow-md cursor-pointer text-sm"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => onComplete(true)}
                className="w-full h-10 sm:h-11 bg-transparent text-zinc-400 font-medium rounded-xl hover:text-white hover:bg-white/5 active:scale-[0.98] transition-all duration-200 cursor-pointer text-sm"
              >
                Cancelar
              </button>
            </div>
          )}

          {status === 'completed' && (
            <div className="py-2 text-emerald-400 text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Sincronização concluída com sucesso!</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
