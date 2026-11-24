import React, { useEffect, useRef } from 'react';

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const PUSH_INTERVAL_MS = 55;

// Onda sonora ao vivo: lê o volume do microfone e desenha barras que rolam para a esquerda.
// Se o navegador não permitir, simplesmente não desenha nada (a gravação não é afetada).
export default function RecordingWaveform({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const g = canvas?.getContext('2d');
    if (!stream || !canvas || !AudioCtx || !g) return;

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let raf = 0;

    try {
      audioCtx = new AudioCtx();
      Promise.resolve(audioCtx.resume()).catch(() => {});
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      const levels: number[] = [];
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let lastPush = 0;

      const draw = (now: number) => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }

        if (now - lastPush >= PUSH_INTERVAL_MS) {
          lastPush = now;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          levels.push(Math.min(1, Math.sqrt(sum / data.length) * 4.5));
        }

        const slot = BAR_WIDTH + BAR_GAP;
        const maxBars = Math.max(0, Math.floor(w / slot));
        if (levels.length > maxBars) levels.splice(0, levels.length - maxBars);

        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(248, 113, 113, 0.9)';
        const startX = w - levels.length * slot;
        for (let i = 0; i < levels.length; i++) {
          const barHeight = Math.max(3, levels[i] * h);
          const x = startX + i * slot;
          const y = (h - barHeight) / 2;
          g.beginPath();
          if (typeof (g as any).roundRect === 'function') {
            (g as any).roundRect(x, y, BAR_WIDTH, barHeight, BAR_WIDTH / 2);
          } else {
            g.rect(x, y, BAR_WIDTH, barHeight);
          }
          g.fill();
        }

        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    } catch {
      // sem onda: a barra de gravação continua funcionando normalmente
    }

    return () => {
      cancelAnimationFrame(raf);
      try { source?.disconnect(); } catch { /* ignora */ }
      // Sem await: em alguns navegadores close() pode nunca resolver.
      try { Promise.resolve(audioCtx?.close()).catch(() => {}); } catch { /* ignora */ }
    };
  }, [stream]);

  return <canvas ref={canvasRef} aria-hidden="true" className="flex-1 min-w-[40px] h-6" />;
}
