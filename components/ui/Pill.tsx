'use client';

import { cn } from '@/lib/cn';

type Tone =
  | 'default' | 'cyan' | 'gold' | 'violet'
  | 'pos' | 'neg' | 'warn' | 'info' | 'mute';

const TONE_MAP: Record<Tone, string> = {
  default: 'border-hairline-strong text-fg-muted bg-surface-2',
  cyan: 'border-cyan/35 text-cyan bg-cyan-soft',
  gold: 'border-gold/35 text-gold bg-gold-soft',
  violet: 'border-violet/35 text-violet bg-violet-soft',
  pos: 'border-pos/30 text-pos bg-pos/10',
  neg: 'border-neg/30 text-neg bg-neg/10',
  warn: 'border-warn/30 text-warn bg-warn/10',
  info: 'border-info/30 text-info bg-info/10',
  mute: 'border-hairline text-fg-faint bg-surface-2/60',
};

export function Pill({
  children,
  tone = 'default',
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('pill', TONE_MAP[tone], className)}>
      {icon ? <span className="-ml-0.5 inline-flex h-3 w-3 items-center justify-center">{icon}</span> : null}
      {children}
    </span>
  );
}

export function StatusDot({
  tone = 'pos',
  pulse = true,
}: {
  tone?: 'pos' | 'warn' | 'neg' | 'info' | 'mute';
  pulse?: boolean;
}) {
  const color =
    tone === 'pos' ? 'bg-pos' :
    tone === 'warn' ? 'bg-warn' :
    tone === 'neg' ? 'bg-neg' :
    tone === 'info' ? 'bg-info' :
    'bg-fg-faint';
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse ? <span className={cn('absolute inset-0 rounded-full opacity-60 animate-ping', color)} /> : null}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
    </span>
  );
}
