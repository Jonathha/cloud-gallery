import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PublicMediaViewerProps {
  decryptedUrl: string | null;
  isVideo: boolean;
  allowDownload: boolean;
  imageFit: 'contain' | 'cover';
  isDownloadingChunks: boolean;
  downloadProgress: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 2.5;
const RESET_VIEW = { scale: 1, x: 0, y: 0 };
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function PublicMediaViewer({
  decryptedUrl,
  isVideo,
  allowDownload,
  imageFit,
  isDownloadingChunks,
  downloadProgress,
}: PublicMediaViewerProps) {
  const [view, setView] = useState(RESET_VIEW);
  const [gesturing, setGesturing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(RESET_VIEW);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startDist: 1, startScale: 1, lastX: 0, lastY: 0, moved: false });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const suppressClickUntil = useRef(0);

  const isImage = !!decryptedUrl && !isVideo;

  const commit = (next: { scale: number; x: number; y: number }) => {
    viewRef.current = next;
    setView(next);
  };

  // Keeps the pan inside the zoomed area.
  const constrain = (scale: number, x: number, y: number) => {
    const el = stageRef.current;
    if (!el || scale <= 1) return RESET_VIEW;
    const maxX = (el.clientWidth * (scale - 1)) / 2;
    const maxY = (el.clientHeight * (scale - 1)) / 2;
    return { scale, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  };

  // Zooms keeping the point under the cursor/fingers fixed.
  const zoomAt = (nextScale: number, clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - (rect.left + rect.width / 2);
    const py = clientY - (rect.top + rect.height / 2);
    const { scale, x, y } = viewRef.current;
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const ratio = s / scale;
    commit(constrain(s, px - (px - x) * ratio, py - (py - y) * ratio));
  };

  // New media or new fit mode: start from a clean view.
  useEffect(() => {
    commit(RESET_VIEW);
    setLoaded(false);
  }, [decryptedUrl]);

  useEffect(() => {
    commit(RESET_VIEW);
  }, [imageFit]);

  // Wheel / trackpad pinch zoom (needs a non-passive listener to block page zoom/scroll).
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !isImage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      zoomAt(viewRef.current.scale * factor, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isImage]);

  // Keyboard: + / - / 0
  useEffect(() => {
    if (!isImage) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (e.key === '+' || e.key === '=') zoomAt(viewRef.current.scale * 1.4, cx, cy);
      else if (e.key === '-') zoomAt(viewRef.current.scale / 1.4, cx, cy);
      else if (e.key === '0') commit(RESET_VIEW);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isImage]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isImage) return;
    stageRef.current?.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.moved = false;
      g.lastX = e.clientX;
      g.lastY = e.clientY;
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.startScale = viewRef.current.scale;
      g.moved = true;
    }
    setGesturing(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((g.startScale * dist) / g.startDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }

    const dx = e.clientX - g.lastX;
    const dy = e.clientY - g.lastY;
    if (!g.moved && Math.hypot(dx, dy) < 6) return; // still a tap
    g.moved = true;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    const v = viewRef.current;
    if (v.scale > 1) commit(constrain(v.scale, v.x + dx, v.y + dy));
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    stageRef.current?.releasePointerCapture?.(e.pointerId);
    const g = gesture.current;

    if (pointers.current.size === 1) {
      // Pinch -> pan hand-off, avoid a jump.
      const [p] = Array.from(pointers.current.values());
      g.lastX = p.x;
      g.lastY = p.y;
      return;
    }
    if (pointers.current.size > 0) return;

    setGesturing(false);
    if (g.moved) {
      suppressClickUntil.current = Date.now() + 350; // a drag/pinch must not toggle the controls
      return;
    }
    if (e.type === 'pointercancel') return;

    // Double tap / double click: toggle zoom around the tap point.
    const now = Date.now();
    const lt = lastTap.current;
    if (now - lt.t < 300 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) {
      lastTap.current = { t: 0, x: 0, y: 0 };
      suppressClickUntil.current = now + 350;
      if (viewRef.current.scale > 1.05) commit(RESET_VIEW);
      else zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (Date.now() < suppressClickUntil.current) e.stopPropagation();
  };

  return (
    <div
      ref={stageRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={isImage ? { touchAction: 'none' } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
    >
      {decryptedUrl ? (
        <div className="w-full h-full flex items-center justify-center relative">
          {isVideo ? (
            <video
              id="decrypted-video-tag"
              src={decryptedUrl}
              controls
              autoPlay
              playsInline
              controlsList={allowDownload ? undefined : 'nodownload'}
              onContextMenu={(e) => e.preventDefault()}
              className="max-h-full max-w-full object-contain select-none bg-black"
              style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
            />
          ) : (
            <>
              {!loaded && (
                <Loader2
                  className="absolute w-8 h-8 text-zinc-500 animate-spin pointer-events-none"
                  strokeWidth={1.5}
                />
              )}
              <img
                id="decrypted-img-tag"
                src={decryptedUrl}
                alt="Shared Asset"
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                className={`select-none ${
                  imageFit === 'cover'
                    ? 'w-full h-full object-cover'
                    : 'max-h-full max-w-full object-contain'
                }`}
                draggable="false"
                style={{
                  WebkitTouchCallout: 'none',
                  userSelect: 'none',
                  opacity: loaded ? 1 : 0,
                  transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
                  transition: gesturing
                    ? 'opacity 300ms ease-out'
                    : 'opacity 300ms ease-out, transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1)',
                  willChange: 'transform',
                  cursor: view.scale > 1 ? (gesturing ? 'grabbing' : 'grab') : 'zoom-in',
                }}
              />
            </>
          )}

          {/* Anti-copy shield overlay if download is disallowed */}
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
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-300 text-sm font-medium">{downloadProgress || 'Descriptografando...'}</p>
        </div>
      ) : (
        <div className="text-zinc-500 text-sm">Nenhum conteúdo decodificado.</div>
      )}
    </div>
  );
}
