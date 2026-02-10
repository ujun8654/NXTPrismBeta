type Variant = 'ok' | 'error' | 'warn' | 'info' | 'neutral';

const COLORS: Record<Variant, string> = {
  ok: 'bg-green-400/10 text-green-400 border-green-400/30',
  error: 'bg-red-400/10 text-red-400 border-red-400/30',
  warn: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  info: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  neutral: 'bg-gray-400/10 text-gray-400 border-gray-400/30',
};

interface Props {
  variant: Variant;
  label: string;
  pulse?: boolean;
}

export default function StatusBadge({ variant, label, pulse }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border ${COLORS[variant]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          variant === 'ok' ? 'bg-green-400' :
          variant === 'error' ? 'bg-red-400' :
          variant === 'warn' ? 'bg-yellow-400' :
          variant === 'info' ? 'bg-blue-400' : 'bg-gray-400'
        } ${pulse ? 'pulse-green' : ''}`}
      />
      {label}
    </span>
  );
}
