'use client';

import { cn } from '@/lib/cn';
import { Pill } from './Pill';

export function QualityTierBadge({
  tier,
  language = 'en',
  size = 'md',
  className,
}: {
  tier: 'verified' | 'discovered';
  language?: 'ko' | 'en';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const isVerified = tier === 'verified';
  const label = isVerified
    ? (language === 'ko' ? '검증됨' : 'Verified')
    : (language === 'ko' ? '발굴됨' : 'Discovered');
  return (
    <Pill
      tone={isVerified ? 'cyan' : 'gold'}
      icon={isVerified ? <CheckIcon /> : <SparkleIcon />}
      className={cn(size === 'sm' && 'h-5 px-1.5 text-[0.625rem]', className)}
    >
      {label}
    </Pill>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" />
    </svg>
  );
}

export function NansenLabelChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      title={`Nansen-style label: ${label}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-violet/30 bg-violet-soft px-2 h-5 text-[0.6875rem] font-medium tracking-tight text-violet',
        className
      )}
    >
      <span className="h-1 w-1 rounded-full bg-violet" />
      <span className="font-mono uppercase">{label}</span>
    </span>
  );
}

export function EarlyDiscoveryBadge({
  language = 'en',
  className,
}: {
  language?: 'ko' | 'en';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gradient-to-r from-gold-soft to-transparent px-2 h-5 text-[0.6875rem] font-medium tracking-tight text-gold',
        className
      )}
    >
      <RadarIcon />
      <span className="uppercase">{language === 'ko' ? '얼리 디스커버리' : 'Early Discovery'}</span>
    </span>
  );
}

function RadarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" opacity="0.4" />
      <circle cx="12" cy="12" r="5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 12L20 7" />
    </svg>
  );
}
