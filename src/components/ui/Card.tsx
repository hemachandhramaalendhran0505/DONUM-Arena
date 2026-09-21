import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padded?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
}

export function Card({ children, className, hover, padded = true, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-ink/5 bg-white shadow-soft',
        padded && 'p-5',
        hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lift',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink/55">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink/55">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
