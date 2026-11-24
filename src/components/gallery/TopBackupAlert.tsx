import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Download, X } from "lucide-react";
import { getAllImagesFromCache } from "../../utils/db";
import { decryptData } from "../../utils/crypto";
import { decryptFileKey, decryptWithFileKey } from "../../utils/fileCrypto";
import { useAuth } from "../../contexts/AuthContext";
import { enforceDataPrefix } from "../../hooks/gallery/decrypt/sessionCache";

export default function TopBackupAlert() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const { user, cryptoKey } = useAuth();

  const userId = user?.uid;

  useEffect(() => {
    // Offline: guarda o pedido e só mostra o aviso quando a internet voltar
    let waitingForOnline = false;
    let cancelled = false;

    const openIfStillPending = async () => {
      waitingForOnline = false;
      if (!navigator.onLine) {
        waitingForOnline = true;
        return;
      }
      if (userId) {
        try {
          const cached = await getAllImagesFromCache(userId);
          if (!cached.some((img: any) => img.isLocalPending || img.isSyncPending)) return;
        } catch {}
      }
      if (!cancelled) setIsOpen(true);
    };

    const handleShow = () => {
      if (navigator.onLine) openIfStillPending();
      else waitingForOnline = true;
    };
    const handleOnline = () => {
      if (waitingForOnline) openIfStillPending();
    };

    window.addEventListener("show-backup-alert", handleShow);
    window.addEventListener("online", handleOnline);

    // Reabrir a galeria não reemite o evento: recheca as pendências já salvas no cache
    void openIfStillPending();

    return () => {
      cancelled = true;
      window.removeEventListener("show-backup-alert", handleShow);
      window.removeEventListener("online", handleOnline);
    };
  }, [userId]);

  const handleBackup = async () => {
    if (!user || !cryptoKey) return;
    setIsBackingUp(true);
    try {
      const cached = await getAllImagesFromCache(user.uid);
      const pending = cached.filter((img: any) => img.isLocalPending || !img.uploadedAt);
      const itemsToBackup = pending.length > 0 ? pending : cached;

      for (let i = 0; i < itemsToBackup.length; i++) {
        const item = itemsToBackup[i];
        if (item.ciphertext && item.iv) {
          try {
            let rawDecrypted: string;
            if (item.fileKeyCiphertext && item.fileKeyIv && item.fileSalt) {
              const fileKeyStr = await decryptFileKey(item.fileKeyCiphertext, item.fileKeyIv, cryptoKey);
              rawDecrypted = await decryptWithFileKey(item.ciphertext as string, item.iv, fileKeyStr, item.fileSalt);
            } else {
              rawDecrypted = await decryptData(item.ciphertext as string, item.iv, cryptoKey);
            }
            const dataUrl = enforceDataPrefix(rawDecrypted, item.contentType || "image/jpeg");
            const a = document.createElement("a");
            a.href = dataUrl;
            const ext = (item.contentType || "image/jpeg").split("/")[1] || "jpg";
            a.download = `backup-${item.id}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise((r) => setTimeout(r, 250));
          } catch (e) {
            console.warn("Failed to decrypt item for backup:", e);
          }
        }
      }
      setIsOpen(false);
    } catch (e) {
      console.error("Backup failed:", e);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[160] bg-[#121212]/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.8)] text-zinc-100 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-white tracking-tight">
                  Aviso de Backup
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                  Não foi possível enviar algumas fotos para a nuvem. Faça o backup delas agora para não correr o risco de perdê-las.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Depois
            </button>
            <button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download size={13} />
              <span>{isBackingUp ? "Baixando..." : "Fazer Backup"}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
