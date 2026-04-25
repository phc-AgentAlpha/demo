export function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' }) {
  const toneClass = {
    neutral: 'border-white/10 bg-white/5 text-slate-300',
    success: 'border-success/30 bg-success/10 text-success',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    danger: 'border-danger/30 bg-danger/10 text-danger',
    accent: 'border-accent/30 bg-accent/10 text-accent',
  }[tone];
  return <span className={`pill ${toneClass}`}>{label}</span>;
}
