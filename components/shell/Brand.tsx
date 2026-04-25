'use client';

export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="AgentAlpha">
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="currentColor" strokeOpacity="0.18" />
      <path d="M6 23 L13 9 L16 9 L13 23 Z" fill="currentColor" fillOpacity="0.95" />
      <path d="M16 23 L23 9 L26 9 L23 23 Z" fill="currentColor" fillOpacity="0.55" />
      <circle cx="23.5" cy="9" r="1.5" fill="#22d3ee" />
    </svg>
  );
}

export function BrandLockup() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <BrandMark size={26} className="text-fg" />
      <div className="flex items-baseline gap-1.5">
        <span className="text-[0.95rem] font-semibold tracking-tight text-fg">AgentAlpha</span>
        <span className="hidden sm:inline font-mono text-[0.7rem] text-fg-faint mt-0.5">v6</span>
      </div>
    </div>
  );
}
