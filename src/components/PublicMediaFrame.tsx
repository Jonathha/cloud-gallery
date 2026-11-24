import React, { useState, useEffect, useRef } from 'react';
import PublicMediaHeader from './publicShare/PublicMediaHeader';
import PublicMediaViewer from './publicShare/PublicMediaViewer';
import PublicMediaFooter from './publicShare/PublicMediaFooter';
import PublicMediaDetailsModal from './publicShare/PublicMediaDetailsModal';
import PublicMediaToast from './publicShare/PublicMediaToast';

interface PublicMediaFrameProps {
  decryptedUrl: string | null;
  allowDownload: boolean;
  isVideo: boolean;
  isDownloadingChunks: boolean;
  downloadProgress: string;
  shareData?: any;
  timeLeft?: number | null;
}

export default function PublicMediaFrame({
  decryptedUrl,
  allowDownload,
  isVideo,
  isDownloadingChunks,
  downloadProgress,
  shareData,
  timeLeft,
}: PublicMediaFrameProps) {
  const [showControls, setShowControls] = useState(true);
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const handleShareOrCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentUrl = window.location.href;
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: isVideo ? 'Vídeo compartilhado via Cloud Gallery' : 'Foto compartilhada via Cloud Gallery',
          url: currentUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      showToast('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Erro ao copiar link.');
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only toggle if clicked directly on backdrop or media wrapper, not buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('#details-modal')) {
      return;
    }
    setShowControls((prev) => !prev);
  };

  const formatCreationDate = (ts?: number) => {
    if (!ts) return 'Recente';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recente';
    }
  };

  const mediaTypeLabel = isVideo
    ? (shareData?.contentType?.toUpperCase() || 'VÍDEO MP4')
    : (shareData?.contentType?.toUpperCase() || 'IMAGEM');

  return (
    <div
      ref={containerRef}
      id="media-frame-wrapper"
      onClick={handleBackgroundClick}
      className="fixed inset-0 bg-black flex flex-col justify-between select-none overflow-hidden"
    >
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

      {/* Top Bar - Header idêntico ao app */}
      <PublicMediaHeader
        showControls={showControls}
        isVideo={isVideo}
        timeLeft={timeLeft}
        imageFit={imageFit}
        setImageFit={setImageFit}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />

      {/* Media Containment Area - Central Stage */}
      <PublicMediaViewer
        decryptedUrl={decryptedUrl}
        isVideo={isVideo}
        allowDownload={allowDownload}
        imageFit={imageFit}
        isDownloadingChunks={isDownloadingChunks}
        downloadProgress={downloadProgress}
      />

      {/* Bottom Bar - Action Bar idêntica ao Lightbox do app */}
      <PublicMediaFooter
        showControls={showControls}
        setIsDetailsOpen={setIsDetailsOpen}
        copied={copied}
        handleShareOrCopy={handleShareOrCopy}
        allowDownload={allowDownload}
        decryptedUrl={decryptedUrl}
        isVideo={isVideo}
        showToast={showToast}
      />

      {/* Modal de Detalhes da Mídia Compartilhada */}
      <PublicMediaDetailsModal
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        mediaTypeLabel={mediaTypeLabel}
        allowDownload={allowDownload}
        shareData={shareData}
        formatCreationDate={formatCreationDate}
      />

      {/* Subtle Toast Feedback */}
      <PublicMediaToast toastMessage={toastMessage} />
    </div>
  );
}
