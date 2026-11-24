import React, { useRef } from 'react';

const MIN_MINUTES = 1;
const MAX_MINUTES = 1440;

interface AutoLockCustomFormProps {
  /** Valor atualmente salvo (para não oferecer "Salvar" quando nada mudou). */
  currentValue: string;
  customMinutes: string;
  setCustomMinutes: (val: string) => void;
  handleCustomSubmit: (e: React.FormEvent) => void;
}

export function AutoLockCustomForm({
  currentValue,
  customMinutes,
  setCustomMinutes,
  handleCustomSubmit,
}: AutoLockCustomFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = customMinutes !== '';
  const parsed = hasValue ? parseInt(customMinutes, 10) : NaN;
  const invalid = hasValue && (isNaN(parsed) || parsed < MIN_MINUTES || parsed > MAX_MINUTES);
  const unchanged = hasValue && !invalid && String(parsed) === currentValue;
  const canSave = hasValue && !invalid && !unchanged;

  const onSubmit = (e: React.FormEvent) => {
    handleCustomSubmit(e);
    // Fecha o teclado no celular depois de salvar
    inputRef.current?.blur();
  };

  return (
    <form onSubmit={onSubmit} className="pt-2" noValidate>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            aria-label="Tempo de bloqueio em minutos"
            aria-invalid={invalid || undefined}
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Digite em minutos (ex: 10)"
            className={`w-full bg-zinc-950/80 border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors duration-150 ${
              invalid ? 'border-red-500/60 focus:border-red-400' : 'border-white/10 focus:border-white/30'
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={!canSave}
          className="px-4 py-2 bg-white hover:bg-zinc-200 active:bg-zinc-300 active:scale-95 text-black font-semibold text-xs rounded-xl transition duration-150 motion-reduce:transition-none cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100"
        >
          Salvar
        </button>
      </div>
      {invalid && (
        <p role="alert" className="pt-1.5 px-1 text-[11px] text-red-400">
          Use de {MIN_MINUTES} a {MAX_MINUTES} minutos (24 h).
        </p>
      )}
    </form>
  );
}

export default AutoLockCustomForm;
