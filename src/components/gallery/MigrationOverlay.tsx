import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { packEncryptedFile } from '../../utils/fileCrypto';
import { Database, ShieldCheck, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { removeImageFromCache } from '../../utils/db';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { doc, setDoc } from 'firebase/firestore';
import { dbPrimary } from '../../firebase';

interface MigrationOverlayProps {
  migrationItems: any[];
  onComplete: (cancelled?: boolean) => void;
}

export default function MigrationOverlay({ migrationItems, onComplete }: MigrationOverlayProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'validating' | 'uploading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartMigration = async () => {
    if (!user) return;
    try {
      setStatus('validating');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStatus('uploading');
      let uploaded = 0;
      
      const token = await user.getIdToken();
      
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
        
        // Remove whitespace, fix base64url and padding if needed
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

        const createdAt = item.createdAt || 0;
        const uploadDate = new Date(createdAt);
        const formattedDate = uploadDate.toLocaleDateString('pt-BR');
        const formattedTime = uploadDate.toLocaleTimeString('pt-BR');
        const isoUploadDate = uploadDate.toISOString();
        const isVideo = item.contentType?.includes('video') || false;
        const rawFileName = item.fileName || item.name || '';
        const fileExt = rawFileName.includes('.')
          ? rawFileName.split('.').pop()?.toUpperCase() || ''
          : (isVideo ? 'WEBM' : 'JPG');
        const finalFileName = rawFileName || `midia_${item.id}.${fileExt.toLowerCase()}`;
        
        try {
          await setDoc(doc(dbPrimary, 'images', item.id), {
            id: item.id,
            userId: user.uid,
            userEmail: user.email || '',
            userName: user.displayName || user.email?.split('@')[0] || 'Anônimo',
            imageUrl: `/api/storage/image/${item.id}`,
            createdAt: createdAt,
            uploadedAt: isoUploadDate,
            timestamp: createdAt,
            date: formattedDate,
            time: formattedTime,
            horario: `${formattedDate} às ${formattedTime}`,
            fileName: finalFileName,
            name: finalFileName,
            size: item.size || item.totalSize || 0,
            fileSize: item.fileSize || item.size || item.totalSize || 0,
            width: item.width || 0,
            height: item.height || 0,
            format: fileExt || (isVideo ? 'WEBM' : 'JPG'),
            formato: fileExt || (isVideo ? 'WEBM' : 'JPG'),
            type: isVideo ? 'video' : 'image',
            status: 'aprovada',
            iv: item.iv || "",
            contentType: item.contentType || (isVideo ? "video/webm" : "image/jpeg"),
            totalSize: item.totalSize || item.size || 0,
            isChunked: item.isChunked || false,
            chunkCount: item.chunkCount || 1,
            thumbnailCiphertext: item.thumbnailCiphertext || "",
            thumbnailIv: item.thumbnailIv || "",
            fileKeyCiphertext: item.fileKeyCiphertext || "",
            fileKeyIv: item.fileKeyIv || "",
            fileSalt: item.fileSalt || ""
          });
        } catch (fbErr) {
          console.warn("Failed to save to firebase", fbErr);
        }
        
        uploaded++;
        setProgress(Math.round((uploaded / migrationItems.length) * 100));
      }
      
      setStatus('completed');
      
      // Cleanup the local cache strictly since we just uploaded them. The loader will refetch from server and re-add them.
      for (const item of migrationItems) {
        await removeImageFromCache(item.id);
      }

      setTimeout(() => {
        onComplete();
      }, 1500);
      
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Erro desconhecido');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
      >
        {status === 'idle' && (
          <button
            onClick={() => onComplete(true)}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col items-center text-center space-y-6">

          
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-white tracking-tight">Sincronização Segura Necessária</h2>
            <p className="text-sm text-gray-400">
              Detectamos {migrationItems.length} {migrationItems.length === 1 ? 'mídia' : 'mídias'} no seu dispositivo que precisam ser sincronizadas com o servidor.
            </p>
          </div>

          <div className="w-full bg-[#1A1A1A] rounded-xl p-4 border border-white/5 space-y-2 text-left">
            <h3 className="text-sm font-medium text-white mb-1">Informações de Segurança</h3>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li><span className="text-gray-500">Criptografia:</span> <span className="text-gray-200">AES-GCM (256-bit)</span></li>
              <li><span className="text-gray-500">Derivação de Chave:</span> <span className="text-gray-200">PBKDF2-HMAC-SHA256</span></li>
              <li><span className="text-gray-500">Isolamento:</span> <span className="text-gray-200">Chave exclusiva por arquivo</span></li>
              <li><span className="text-gray-500">Data da Operação:</span> <span className="text-gray-200">{new Date().toLocaleString('pt-BR')}</span></li>
            </ul>
          </div>

          <div className="w-full bg-[#1A1A1A] rounded-xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center text-sm">
              {status === 'idle' ? <ShieldCheck className="w-4 h-4 text-zinc-100 mr-3" /> : (status === 'validating' ? <Loader2 className="w-4 h-4 text-zinc-100 animate-spin mr-3" /> : <CheckCircle2 className="w-4 h-4 text-gray-500 mr-3" />)}
              <span className={status === 'validating' ? 'text-white' : 'text-gray-400'}>Validando {migrationItems.length} arquivos locais</span>
            </div>
            <div className="flex items-center text-sm">
              {status === 'uploading' ? <Loader2 className="w-4 h-4 text-zinc-100 animate-spin mr-3" /> : (status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-gray-500 mr-3" /> : <CheckCircle2 className="w-4 h-4 text-[#333] mr-3" />)}
              <span className={status === 'uploading' ? 'text-white' : (status === 'completed' ? 'text-gray-400' : 'text-gray-500')}>Enviando dados ({progress}%)</span>
            </div>
            {status === 'error' && (
               <div className="flex items-center text-sm text-red-400 mt-2">
                 <AlertCircle className="w-4 h-4 mr-3" />
                 <span>{errorMsg}</span>
               </div>
            )}
          </div>

          {status === 'idle' && (
            <div className="w-full space-y-2">
              <button 
                onClick={handleStartMigration}
                className="w-full h-12 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Iniciar Sincronização
              </button>
              <button 
                onClick={() => onComplete(true)}
                className="w-full h-12 bg-transparent text-gray-400 font-medium rounded-xl hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
          {status === 'error' && (
            <button 
              onClick={handleStartMigration}
              className="w-full h-12 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
