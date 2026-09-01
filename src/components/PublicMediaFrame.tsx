import React from 'react';
import { Download, Loader2 } from 'lucide-react';

interface PublicMediaFrameProps {
  /**
   * Safe decrypted BLOB url target
   */
  decryptedUrl: string | null;
  /**
   * If true, enables resource retrieval download buttons
   */
  allowDownload: boolean;
  /**
   * Video content identifier
   */
  isVideo: boolean;
  /**
   * Progress of chunk file sequence download
   */
  isDownloadingChunks: boolean;
  /**
   * Active string download percentages or loading updates
   */
  downloadProgress: string;
}

/**
 * PublicMediaFrame is a highly protected responsive media box.
 * Implements:
 * - Direct click overlay shields to block drag-and-drop or right-click saves
 * - Responsive video HTML players
 * - Sequential chunk loading indicator loops
 */
export default function PublicMediaFrame({
  decryptedUrl,
  allowDownload,
  isVideo,
  isDownloadingChunks,
  downloadProgress
}: PublicMediaFrameProps) {
  return (
    <div id="media-frame-wrapper" className="min-h-screen bg-black flex flex-col items-center justify-center relative select-none">
      
      {/* Title Header */}
      <header className="absolute top-0 inset-x-0 p-4 sm:p-5 flex justify-end items-center bg-gradient-to-b from-black/80 to-transparent z-40">
        <div className="flex items-center gap-3">
          {allowDownload && decryptedUrl && (
            <a
              id="btn-permit-download"
              href={decryptedUrl}
              download={isVideo ? `shared-video-${Date.now()}.mp4` : `shared-image-${Date.now()}.png`}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold hover:text-white rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <Download size={14} /> Download
            </a>
          )}
        </div>
      </header>

      {/* Dynamic CSS styles to prevent screen printing and block touch callbacks */}
      <style>{`
        @media print {
          body, html, #root {
            display: none !important;
            visibility: hidden !important;
          }
        }
        img, video {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -khtml-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `}</style>

      {/* Media Containment area */}
      <div className="w-full max-w-full max-h-screen aspect-auto flex items-center justify-center p-4 pt-16 pb-12 relative overflow-hidden">
        {decryptedUrl ? (
          <div className="relative max-h-[85vh] max-w-[95vw] shadow-2xl rounded-2xl overflow-hidden border border-zinc-900 group bg-zinc-950 flex justify-center items-center">
            
            {isVideo ? (
              <video 
                id="decrypted-video-tag"
                src={decryptedUrl} 
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                className="max-h-[80vh] max-w-full object-contain select-none rounded bg-black inline-block"
                style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
              />
            ) : (
              <img 
                id="decrypted-img-tag"
                src={decryptedUrl} 
                alt="Shared Vault Vaulted Asset" 
                className="max-h-[80vh] max-w-full object-contain pointer-events-none select-none rounded bg-zinc-950 inline-block"
                draggable="false"
                style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
              />
            )}

            {/* Strict anti-copy shield overlay */}
            {!allowDownload && !isVideo && (
              <div 
                id="anti-copy-shield"
                className="absolute inset-0 bg-transparent cursor-default pointer-events-auto select-none"
                onContextMenu={(e) => e.preventDefault()}
              />
            )}
          </div>
        ) : isDownloadingChunks ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <p className="text-zinc-200 text-sm font-semibold">{downloadProgress}</p>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">Nenhum conteúdo decodificado.</div>
        )}
      </div>

    </div>
  );
}
