import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { dbPrimary } from '../../firebase';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { saveImageToCache } from '../../utils/db';
import { packEncryptedFileV2 } from '../../utils/fileCrypto';

interface UploadServerParams {
  user: any;
  newId: string;
  processedFile: File;
  isVideo: boolean;
  itemCreatedAt: number;
  encryptedFull: { ciphertext: string; iv: string };
  thumbnailCiphertext: string;
  thumbnailIv: string;
  encryptedKey: { ciphertext: string; iv: string };
  fileSalt: string;
  fileKey: string;
  setProgressText: (text: string) => void;
  fileLabel: string;
}

export async function uploadToCofreAndFirestore({
  user,
  newId,
  processedFile,
  isVideo,
  itemCreatedAt,
  encryptedFull,
  thumbnailCiphertext,
  thumbnailIv,
  encryptedKey,
  fileSalt,
  fileKey,
  setProgressText,
  fileLabel,
}: UploadServerParams): Promise<{ isCloudSyncFailed: boolean; finalSize: number }> {
  let isCloudSyncFailed = false;
  let finalSize = processedFile.size;

  let width = 0;
  let height = 0;
  if (!isVideo) {
    try {
      const dim = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(processedFile);
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0 });
          URL.revokeObjectURL(img.src);
        };
      });
      width = dim.width;
      height = dim.height;
    } catch (e) {
      console.warn("Failed to get dimensions:", e);
    }
  }

  const uploadDate = new Date(itemCreatedAt || Date.now());
  const formattedDate = uploadDate.toLocaleDateString('pt-BR');
  const formattedTime = uploadDate.toLocaleTimeString('pt-BR');
  const isoUploadDate = uploadDate.toISOString();
  const fallbackExt = processedFile.type ? processedFile.type.split('/')[1]?.toUpperCase() || 'JPEG' : (isVideo ? 'WEBM' : 'JPEG');
  const fileExt = processedFile.name && processedFile.name.includes('.')
    ? processedFile.name.split('.').pop()?.toUpperCase() || fallbackExt
    : fallbackExt;

  if (!navigator.onLine) {
    isCloudSyncFailed = true;
  } else {
    try {
      const token = await user.getIdToken(false).catch(() => "");
      const apiBase = getApiBaseUrl();

      setProgressText(`Enviando para o cofre seguro (${fileLabel})...`);
      
      const cleanMetadata = {
        id: newId,
        userId: user.uid,
        iv: encryptedFull.iv,
        contentType: processedFile.type || (isVideo ? "video/webm" : "image/jpeg"),
        totalSize: processedFile.size,
        isChunked: false,
        chunkCount: 1,
        thumbnailCiphertext: "", // KEEP EMPTY IN HEADER TO PREVENT HTTP 500 (16KB HEADER LIMIT)
        thumbnailIv: thumbnailIv || "",
        fileKeyCiphertext: encryptedKey.ciphertext || "",
        fileKeyIv: encryptedKey.iv || "",
        fileSalt: fileSalt || ""
      };

      // Pack thumbnail ciphertext + encrypted media into single ENC2 binary package
      const enc2Buffer = packEncryptedFileV2(
        cleanMetadata,
        thumbnailCiphertext || "",
        encryptedFull.ciphertext || ""
      );

      let uploadRes: Response | null = null;

      try {
         uploadRes = await fetch(`${apiBase}/api/storage/upload-raw`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/octet-stream',
             'X-File-Key': btoa(fileKey),
             'X-File-Salt': fileSalt,
             'X-File-Iv': encryptedFull.iv,
             'X-File-Metadata': btoa(unescape(encodeURIComponent(JSON.stringify(cleanMetadata))))
           },
           body: enc2Buffer
         });
      } catch (relErr) {
        console.warn('Primary upload request failed:', relErr);
      }

      if ((!uploadRes || !uploadRes.ok) && apiBase !== "https://secure-vault-backend.jogonesteterp.workers.dev") {
        const fallbackWorkerUrl = "https://secure-vault-backend.jogonesteterp.workers.dev";
        try {
           uploadRes = await fetch(`${fallbackWorkerUrl}/api/storage/upload-raw`, {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/octet-stream',
               'X-File-Key': btoa(fileKey),
               'X-File-Salt': fileSalt,
               'X-File-Iv': encryptedFull.iv,
               'X-File-Metadata': btoa(unescape(encodeURIComponent(JSON.stringify(cleanMetadata))))
             },
             body: enc2Buffer
           });
        } catch (fallbackErr) {
          console.warn('Fallback worker upload failed:', fallbackErr);
        }
      }

      if (!uploadRes || !uploadRes.ok) {
        const uploadErrData = uploadRes ? await uploadRes.json().catch(() => ({})) : {};
        throw new Error(uploadErrData.error || 'Erro na resposta do servidor de upload');
      }

      const resData = await uploadRes.clone().json().catch(() => ({}));
      if (resData.processedSize) finalSize = resData.processedSize;

      const officialServerTimestamp = Number(resData.createdAt || resData.timestamp) || Date.now();
      const officialDate = new Date(officialServerTimestamp);
      const officialFormattedDate = officialDate.toLocaleDateString('pt-BR');
      const officialFormattedTime = officialDate.toLocaleTimeString('pt-BR');
      const officialIsoUploadDate = officialDate.toISOString();

      // RECORD TO FIRESTORE ONLY AFTER CONFIRMED R2 STORAGE SUCCESS
      try {
        await setDoc(doc(dbPrimary, 'images', newId), {
          id: newId,
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || user.email?.split('@')[0] || 'Anônimo',
          imageUrl: `/api/storage/image/${newId}`,
          createdAt: officialServerTimestamp,
          uploadedAt: officialIsoUploadDate,
          timestamp: officialServerTimestamp,
          date: officialFormattedDate,
          time: officialFormattedTime,
          horario: `${officialFormattedDate} às ${officialFormattedTime}`,
          fileName: processedFile.name || `midia_${newId}.${fileExt.toLowerCase()}`,
          name: processedFile.name || `midia_${newId}.${fileExt.toLowerCase()}`,
          size: processedFile.size || 0,
          fileSize: processedFile.size || 0,
          width: width || 0,
          height: height || 0,
          format: fileExt,
          formato: fileExt,
          type: isVideo ? 'video' : 'image',
          status: 'aprovada',
          iv: encryptedFull.iv || "",
          contentType: processedFile.type || (isVideo ? "video/webm" : "image/jpeg"),
          totalSize: processedFile.size || 0,
          isChunked: false,
          chunkCount: 1,
          thumbnailCiphertext: "",
          thumbnailKey: `images/${newId}.enc`,
          thumbnailIv: thumbnailIv || "",
          fileKeyCiphertext: encryptedKey.ciphertext || "",
          fileKeyIv: encryptedKey.iv || "",
          fileSalt: fileSalt || ""
        });
      } catch (fsErr) {
        console.warn('Erro ao salvar metadados da imagem no Firestore:', fsErr);
      }

      await saveImageToCache({
        id: newId,
        ciphertext: encryptedFull.ciphertext,
        iv: encryptedFull.iv,
        createdAt: officialServerTimestamp,
        isChunked: false,
        chunkCount: 1,
        contentType: processedFile.type,
        totalSize: processedFile.size,
        thumbnailCiphertext,
        thumbnailIv,
        fileKeyCiphertext: encryptedKey.ciphertext,
        fileKeyIv: encryptedKey.iv,
        fileSalt
      });

    } catch (localUploadErr: any) {
      console.warn('Erro ao salvar no servidor de armazenamento:', localUploadErr);
      isCloudSyncFailed = true;
    }
  }

  return { isCloudSyncFailed, finalSize };
}
