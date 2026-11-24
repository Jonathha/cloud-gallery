import React, { useEffect, useState } from 'react';
import Spinner from './Spinner';

// Loaders consecutivos (login -> chunk da galeria -> desbloqueio) são instâncias diferentes.
// Se a nova entrar com atraso/fade, o loader some e volta; então ela entra direto quando
// há outro na tela ou acabou de sair.
const HANDOFF_MS = 500;
let visibleCount = 0;
let lastHiddenAt = -Infinity;

/**
 * Tela de carregamento principal: anel + glifo da galeria (mesmo ícone do app).
 * Só o primeiro loader usa atraso + fade (para carregamentos rápidos não piscarem);
 * os seguintes continuam de onde o anterior parou.
 */
export default function LoadingMark() {
  const [immediate] = useState(
    () =>
      typeof document !== 'undefined' &&
      (!!document.getElementById('boot-loader') || visibleCount > 0 || Date.now() - lastHiddenAt < HANDOFF_MS)
  );

  useEffect(() => {
    visibleCount += 1;
    return () => {
      visibleCount -= 1;
      lastHiddenAt = Date.now();
    };
  }, []);

  return (
    <div className={`gs-loader${immediate ? ' gs-loader--immediate' : ''}`} role="status" aria-label="Carregando">
      <div className="gs-loader__mark">
        <Spinner size={56} thickness={3} syncPhase />
        <svg className="gs-loader__glyph" viewBox="118 118 276 276" fill="none" aria-hidden="true">
          <rect x="128" y="128" width="256" height="256" rx="32" stroke="currentColor" strokeWidth="20" />
          <path d="M168 344 L228 248 L288 308 L328 268 L344 288 L344 344 Z" fill="currentColor" />
          <circle className="gs-loader__sun" cx="308" cy="208" r="24" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
