import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, Download, Eye, EyeOff, Link2, Lock, Timer } from 'lucide-react';
import ShareButton from './ShareButton';
import ShareSpinner from './ShareSpinner';

interface ShareConfigFormProps {
  linkDuration: '1h' | 'permanent';
  setLinkDuration: (duration: '1h' | 'permanent') => void;
  requirePassword: boolean;
  setRequirePassword: (value: boolean) => void;
  password: string;
  setPassword: (value: string) => void;
  allowDownload: boolean;
  setAllowDownload: (value: boolean) => void;
  oneTimeView: boolean;
  setOneTimeView: (value: boolean) => void;
  loading: boolean;
  checking?: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

const DURATIONS: { value: '1h' | 'permanent'; label: string; hint: string }[] = [
  { value: '1h', label: '1 hora', hint: 'O link deixa de funcionar sozinho em 1 hora.' },
  { value: 'permanent', label: 'Permanente', hint: 'O link funciona até você excluí-lo.' },
];

interface SwitchRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  describedBy?: string;
}

/** A labelled on/off row with a refined, high-contrast monochrome switch. */
function SwitchRow({ icon, title, description, checked, disabled = false, onChange, describedBy }: SwitchRowProps) {
  return (
    <label
      className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border select-none transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-zinc-900 bg-zinc-900/30'
          : 'cursor-pointer border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-700/80'
      }`}
    >
      <span className="shrink-0 text-zinc-400" aria-hidden="true">{icon}</span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-xs sm:text-sm font-medium text-zinc-200">{title}</span>
        <span id={describedBy} className="text-[11px] sm:text-xs text-zinc-500 leading-snug">{description}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={e => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors motion-reduce:transition-none peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 ${
          checked ? 'bg-zinc-100 border-zinc-100' : 'bg-zinc-800 border-zinc-700/80'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] h-3.5 w-3.5 rounded-full transition-transform motion-reduce:transition-none shadow-sm ${
            checked ? 'translate-x-4 bg-zinc-950' : 'translate-x-0 bg-zinc-400'
          }`}
        />
      </span>
    </label>
  );
}

export default function ShareConfigForm({
  linkDuration, setLinkDuration, requirePassword, setRequirePassword, password, setPassword,
  allowDownload, setAllowDownload, oneTimeView, setOneTimeView, loading, checking = false, onClose, onGenerate
}: ShareConfigFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { firstOptionRef.current?.focus({ preventScroll: true }); }, []);

  const passwordTooShort = requirePassword && password.length < 6;
  const canGenerate = !loading && !checking && !(oneTimeView && allowDownload) && !passwordTooShort;
  const duration = DURATIONS.find(d => d.value === linkDuration) ?? DURATIONS[0];

  const summary = [
    linkDuration === '1h' ? 'Expira em 1 hora' : 'Sem prazo de validade',
    requirePassword ? 'com senha' : 'sem senha',
    oneTimeView ? 'abre uma única vez' : allowDownload ? 'com download' : 'sem download',
  ].join(', ') + '.';

  return (
    <form
      id="share-config-form"
      className="flex flex-col gap-3.5 text-left"
      onSubmit={e => { e.preventDefault(); if (canGenerate) onGenerate(); }}
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs sm:text-sm font-semibold text-zinc-200 flex items-center gap-1.5 mb-1.5">
          <Clock size={13} className="text-zinc-400" aria-hidden="true" /> Validade do link
        </legend>
        <div role="radiogroup" aria-label="Validade do link" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
          {DURATIONS.map((option, index) => {
            const selected = option.value === linkDuration;
            return (
              <button
                key={option.value}
                ref={index === 0 ? firstOptionRef : undefined}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setLinkDuration(option.value)}
                className={`relative h-8 sm:h-8.5 rounded-lg text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  selected ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="share-duration-pill"
                    aria-hidden="true"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    className="absolute inset-0 rounded-lg bg-zinc-800 border border-zinc-700/60 shadow-sm"
                  />
                )}
                <span className="relative">{option.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] sm:text-xs text-zinc-500" aria-live="polite">{duration.hint}</p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <SwitchRow
          icon={<Lock size={15} />}
          title="Exigir senha"
          description="Quem abrir o link precisa digitar a senha."
          checked={requirePassword}
          onChange={setRequirePassword}
          describedBy="share-password-desc"
        />
        <AnimatePresence initial={false}>
        {requirePassword && (
          <motion.div
            key="password-field"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 px-0.5 py-0.5">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={6}
                  aria-label="Senha do compartilhamento"
                  aria-describedby="share-password-hint"
                  placeholder="Digite uma senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-800 pl-3 pr-9 text-base sm:text-sm text-white font-mono focus-visible:outline-none focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p
                id="share-password-hint"
                className={`text-[11px] sm:text-xs flex items-center gap-1 ${
                  passwordTooShort ? 'text-zinc-500' : 'text-zinc-300'
                }`}
              >
                {passwordTooShort ? (
                  `Use pelo menos 6 caracteres (${password.length}/6).`
                ) : (
                  <>
                    <Check size={12} className="text-zinc-400" strokeWidth={2.5} />
                    Senha com tamanho suficiente.
                  </>
                )}
              </p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <SwitchRow
          icon={<Download size={15} />}
          title="Permitir download"
          description={oneTimeView ? 'Indisponível com visualização única.' : 'Quem abrir pode salvar a mídia no aparelho.'}
          checked={oneTimeView ? false : allowDownload}
          disabled={oneTimeView}
          onChange={setAllowDownload}
          describedBy="share-download-desc"
        />
        <SwitchRow
          icon={<Timer size={15} />}
          title="Visualização única"
          description="Abre uma vez e deixa de funcionar 1 minuto depois do primeiro acesso."
          checked={oneTimeView}
          onChange={setOneTimeView}
          describedBy="share-one-time-desc"
        />
      </div>

      <p role="status" className="text-[11px] sm:text-xs text-zinc-400 rounded-lg bg-zinc-900/40 border border-zinc-800/60 px-3 py-2 leading-relaxed">
        <span className="text-zinc-500">Configuração: </span>{summary}
      </p>

      <div className="flex gap-2.5 pt-1">
        <ShareButton variant="secondary" size="md" onClick={onClose} className="flex-1">
          Cancelar
        </ShareButton>
        <ShareButton type="submit" variant="primary" size="md" disabled={!canGenerate} className="flex-[1.3]">
          {loading ? (
            <>
              <ShareSpinner size="sm" dark /> Gerando link…
            </>
          ) : (
            <>
              <Link2 size={14} /> Gerar link
            </>
          )}
        </ShareButton>
      </div>
    </form>
  );
}
