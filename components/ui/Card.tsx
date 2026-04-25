'use client';

import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
  interactive = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-hairline bg-surface shadow-card',
        interactive && 'transition-colors duration-150 hover:border-hairline-strong hover:bg-surface-2/60 cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline', className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex items-center justify-between gap-3 px-4 py-3 border-t border-hairline', className)}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-6 mb-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-micro uppercase tracking-[0.08em] text-fg-faint mb-1.5">{eyebrow}</div>
        ) : null}
        <h2 className="text-h1 text-fg">{title}</h2>
        {description ? (
          <p className="text-small text-fg-muted mt-1.5 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
