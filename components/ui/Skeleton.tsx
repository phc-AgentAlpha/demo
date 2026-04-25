'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md bg-surface-2/80 relative overflow-hidden',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent',
        className
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12 rounded-xl border border-dashed border-hairline-strong bg-surface/40', className)}>
      {icon ? <div className="text-fg-faint mb-3">{icon}</div> : null}
      <div className="text-h2 text-fg">{title}</div>
      {description ? <p className="text-small text-fg-muted mt-1.5 max-w-md">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
