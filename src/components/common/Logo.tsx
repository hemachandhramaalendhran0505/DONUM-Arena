import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

/**
 * The DONUM mark: two arcs handing over a shared centre — surplus flowing into
 * scarcity. Kept as inline SVG so it stays crisp and themable.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn('h-9 w-9', className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="url(#donum-grad)" />
      <path
        d="M12.5 12.5h5.2c4.3 0 7.3 3 7.3 7.5s-3 7.5-7.3 7.5h-5.2V12.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="27.5" cy="15" r="3.1" fill="white" fillOpacity="0.55" />
      <defs>
        <linearGradient id="donum-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6C3CE9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  to = '/',
  className,
  showTagline = false,
  invert = false,
}: {
  to?: string;
  className?: string;
  showTagline?: boolean;
  invert?: boolean;
}) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', className)}>
      <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:scale-105" />
      <span className="leading-none">
        <span
          className={cn(
            'block text-lg font-extrabold tracking-tight',
            invert ? 'text-white' : 'text-ink',
          )}
        >
          DONUM
        </span>
        {showTagline && (
          <span
            className={cn(
              'mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em]',
              invert ? 'text-white/60' : 'text-primary/70',
            )}
          >
            Surplus to scarcity
          </span>
        )}
      </span>
    </Link>
  );
}
