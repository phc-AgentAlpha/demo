'use client';

import { cn } from '@/lib/cn';
import { forwardRef } from 'react';

type Variant = 'primary' | 'gold' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const V: Record<Variant, string> = {
  primary: 'bg-cyan text-bg border-cyan hover:bg-cyan/90 disabled:bg-cyan/40 disabled:border-cyan/40',
  gold: 'bg-gold text-bg border-gold hover:bg-gold/90 disabled:bg-gold/40 disabled:border-gold/40',
  ghost: 'bg-transparent border-transparent text-fg-muted hover:text-fg hover:bg-surface-2',
  outline: 'bg-transparent border-hairline-strong text-fg hover:bg-surface-2 hover:border-fg-faint',
  danger: 'bg-neg/15 text-neg border-neg/30 hover:bg-neg/20',
};

const S: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-9 px-3.5 text-small',
  lg: 'h-11 px-5 text-body',
};

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}>(function Button(
  { variant = 'primary', size = 'md', iconLeft, iconRight, loading, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        V[variant], S[size], className
      )}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      <span>{children}</span>
      {!loading ? iconRight : null}
    </button>
  );
});

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
