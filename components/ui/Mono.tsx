'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { shortAddress, shortHash } from '@/lib/format';

export function Mono({
  value,
  kind = 'address',
  className,
  copyable = true,
}: {
  value: string;
  kind?: 'address' | 'hash' | 'raw';
  className?: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const display = kind === 'address' ? shortAddress(value) : kind === 'hash' ? shortHash(value) : value;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      onClick={copyable ? handleCopy : undefined}
      title={value}
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[0.8125rem] tabular text-fg-muted',
        copyable && 'hover:text-fg transition-colors cursor-pointer',
        className
      )}
    >
      <span>{display}</span>
      {copyable ? (
        <span className="text-fg-faint">
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          )}
        </span>
      ) : null}
    </button>
  );
}
