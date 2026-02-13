type Variant = 'ok' | 'error' | 'warn' | 'info' | 'neutral';

// FAA HF-STD-010A 기반 시맨틱 컬러
// CVD 접근성: 색상 + 아이콘 + 텍스트 3중 부호화
const STYLES: Record<Variant, { bg: string; dot: string; icon: string; glow: string }> = {
  ok:      { bg: 'bg-[#23E162]/10 text-[#23E162]', dot: 'bg-[#23E162]', icon: '✓', glow: 'shadow-glow-green' },
  error:   { bg: 'bg-[#FF1320]/10 text-[#FF1320]', dot: 'bg-[#FF1320]', icon: '✕', glow: 'shadow-glow-red' },
  warn:    { bg: 'bg-[#FE930D]/10 text-[#FE930D]', dot: 'bg-[#FE930D]', icon: '△', glow: 'shadow-glow-orange' },
  info:    { bg: 'bg-[#5E8DF6]/10 text-[#5E8DF6]', dot: 'bg-[#5E8DF6]', icon: '●', glow: 'shadow-glow-blue' },
  neutral: { bg: 'bg-[#B3B3B3]/10 text-[#B3B3B3]', dot: 'bg-[#B3B3B3]', icon: '—', glow: '' },
};

interface Props {
  variant: Variant;
  label: string;
  pulse?: boolean;
  glow?: boolean;
}

export default function StatusBadge({ variant, label, pulse, glow }: Props) {
  const s = STYLES[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full ${s.bg} ${glow ? s.glow : ''} transition-shadow`}>
      <span className={`text-[9px] leading-none ${pulse ? 'pulse-dot' : ''}`}>{s.icon}</span>
      {label}
    </span>
  );
}
