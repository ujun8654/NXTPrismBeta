type Variant = 'ok' | 'error' | 'warn' | 'info' | 'neutral';

const STYLES: Record<Variant, { bg: string; dot: string }> = {
  ok:      { bg: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  error:   { bg: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' },
  warn:    { bg: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
  info:    { bg: 'bg-neutral-500/10 text-neutral-300', dot: 'bg-neutral-400' },
  neutral: { bg: 'bg-neutral-500/10 text-neutral-500', dot: 'bg-neutral-500' },
};

interface Props {
  variant: Variant;
  label: string;
  pulse?: boolean;
}

export default function StatusBadge({ variant, label, pulse }: Props) {
  const s = STYLES[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${pulse ? 'pulse-dot' : ''}`} />
      {label}
    </span>
  );
}
