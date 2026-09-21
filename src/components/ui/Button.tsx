import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-lift hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary/40 disabled:shadow-none',
  secondary:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 active:bg-primary-200 disabled:text-primary/40',
  outline:
    'border border-ink/12 bg-white text-ink hover:border-primary/40 hover:bg-primary-50/60 hover:text-primary-700 disabled:text-ink/30',
  ghost: 'text-ink/70 hover:bg-ink/5 hover:text-ink disabled:text-ink/30',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 disabled:bg-danger/40',
  success: 'bg-success text-white hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-success/40',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-2xl py-3.5',
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
}

export type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

function classes({ variant = 'primary', size = 'md', fullWidth, className }: BaseProps) {
  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition-all duration-200 focus-ring',
    'disabled:cursor-not-allowed active:scale-[0.985]',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, icon, iconRight, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classes({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

interface LinkButtonProps extends BaseProps {
  to: string;
  state?: unknown;
  onClick?: () => void;
}

export function LinkButton({ to, state, onClick, icon, iconRight, children, ...rest }: LinkButtonProps) {
  return (
    <Link to={to} state={state} onClick={onClick} className={classes({ ...rest, className: rest.className })}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
