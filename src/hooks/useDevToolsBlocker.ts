import React, { useEffect } from 'react';

export function useDevToolsBlocker(
  blobUrlRef: React.MutableRefObject<string | null>,
  setDecryptedUrl: (url: string | null) => void,
  setError: (err: string) => void
) {
  useEffect(() => {
    // Disable right click globally on public view page to prevent downloading
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    // Prevent common shortcuts to inspect code, print, or save
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return;
      }
      if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I' || e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey && (e.key === 'U' || e.key === 'u')) || (e.metaKey && e.altKey && (e.key === 'U' || e.key === 'u'))) {
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        return;
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    // DevTools detection targeting window size change
    let checkInterval: any;
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setDecryptedUrl(null);
        setError('Acesso bloqueado: Ferramentas de desenvolvedor detectadas.');
      }
    };

    checkInterval = setInterval(detectDevTools, 1000);
    window.addEventListener('resize', detectDevTools);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      clearInterval(checkInterval);
      window.removeEventListener('resize', detectDevTools);
    };
  }, [blobUrlRef, setDecryptedUrl, setError]);
}
