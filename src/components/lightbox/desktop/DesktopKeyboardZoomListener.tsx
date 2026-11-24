import { useEffect } from 'react';
import { useControls } from 'react-zoom-pan-pinch';

interface DesktopKeyboardZoomListenerProps {
  isCurrent: boolean;
}

/**
 * Desktop Keyboard Zoom Shortcuts
 * Allows PC users to navigate zoom with +, -, 0, and Escape keys
 */
export default function DesktopKeyboardZoomListener({ isCurrent }: DesktopKeyboardZoomListenerProps) {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  useEffect(() => {
    if (!isCurrent) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn(0.4);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut(0.4);
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCurrent, zoomIn, zoomOut, resetTransform]);

  return null;
}
