import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { compactNumber } from '@/utils/format';

interface StatProps {
  label: string;
  value: number | string;
  suffix?: string;
  icon?: ReactNode;
  trend?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  animate?: boolean;
  className?: string;
}

const TONES = {
  primary: 'bg-primary-50 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-ink/5 text-ink/60',
};

export function Stat({
  label,
  value,
  suffix,
  icon,
  trend,
  tone = 'primary',
  animate = true,
  className,
}: StatProps) {
  const numeric = typeof value === 'number' ? value : null;
  const animated = useCountUp(numeric ?? 0, { enabled: animate && numeric !== null });
  const display = numeric === null ? value : compactNumber(animated);

  return (
    <div
      className={cn(
        'rounded-2xl border border-ink/5 bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
        {icon && <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', TONES[tone])}>{icon}</span>}
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {display}
        {suffix && <span className="ml-1 text-base font-bold text-ink/45">{suffix}</span>}
      </p>
      {trend && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-success">
          <TrendingUp className="h-3.5 w-3.5" />
          {trend}
        </p>
      )}
    </div>
  );
}
