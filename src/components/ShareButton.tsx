import React from 'react';

export type ShareButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'ghostDanger';
export type ShareButtonSize = 'md' | 'sm' | 'icon';

interface ShareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ShareButtonVariant;
  size?: ShareButtonSize;
}

const BASE =
  'relative inline-flex items-center justify-center gap-1.5 font-medium select-none whitespace-nowrap cursor-pointer ' +
  'transition-all duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ' +
  'disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] disabled:active:scale-100';

const VARIANTS: Record<ShareButtonVariant, string> = {
  primary:
    'bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-sm border border-transparent',
  secondary:
    'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 hover:text-white border border-zinc-700/60 shadow-sm',
  danger:
    'bg-red-600 hover:bg-red-500 text-white font-semibold shadow-sm border border-transparent',
  success:
    'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 shadow-sm',
  ghost:
    'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent',
  ghostDanger:
    'text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent',
};

const SIZES: Record<ShareButtonSize, string> = {
  md: 'h-9 px-3.5 text-xs sm:text-sm rounded-xl',
  sm: 'h-8 px-2.5 text-xs rounded-lg',
  icon: 'h-8 w-8 rounded-lg shrink-0',
};

/** Refined, compact button component used across the share flow. */
const ShareButton = React.forwardRef<HTMLButtonElement, ShareButtonProps>(function ShareButton(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
});

export default ShareButton;
