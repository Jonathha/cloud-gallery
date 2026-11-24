import React from 'react';

interface SpinnerProps {
  /** Diâmetro em px. */
  size?: number;
  /** Espessura do anel em px (padrão proporcional ao tamanho). */
  thickness?: number;
  /** `ink` = preto, para fundos claros fixos (ex.: botão branco). */
  tone?: 'brand' | 'ink';
  label?: string;
  className?: string;
  /** Alinha a fase da rotação a um relógio global: ao trocar de loader o arco não "pula" de volta ao topo. */
  syncPhase?: boolean;
}

// Mesma duração de .gs-spinner__arc em styles/spinner.css
const SPIN_MS = 1050;

/** Spinner único do app: anel com cauda em gradiente azul da marca. Estilos em styles/spinner.css. */
export default function Spinner({ size = 24, thickness, tone = 'brand', label, className = '', syncPhase = false }: SpinnerProps) {
  const t = thickness ?? Math.min(4, Math.max(2, Math.round(size * 0.09 * 2) / 2));
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`gs-spinner${tone === 'ink' ? ' gs-spinner--ink' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--gs-size': `${size}px`, '--gs-t': `${t}px` } as React.CSSProperties}
    >
      <span
        className="gs-spinner__arc"
        style={syncPhase ? { animationDelay: `-${Math.round(performance.now() % SPIN_MS)}ms` } : undefined}
      />
    </span>
  );
}
