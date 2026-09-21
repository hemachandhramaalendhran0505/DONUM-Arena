import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function Field({ label, hint, error, required, children, className, htmlFor }: FieldWrapperProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="donum-label">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="donum-hint">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  wrapperClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, className, wrapperClassName, required, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? rest.name ?? autoId;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
      htmlFor={inputId}
    >
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn('donum-input', icon && 'pl-10', error && 'border-danger focus:border-danger focus:ring-danger/10', className)}
          aria-invalid={Boolean(error)}
          {...rest}
        />
      </div>
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, required, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? rest.name ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        className={cn('donum-input min-h-[104px] resize-y leading-relaxed', error && 'border-danger', className)}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, wrapperClassName, options, placeholder, required, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? rest.name ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} htmlFor={inputId}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={cn('donum-input appearance-none pr-10', error && 'border-danger', className)}
          aria-invalid={Boolean(error)}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
      </div>
    </Field>
  );
});

/** Segmented choice control used for categories, urgency, roles etc. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  columns = 3,
  required,
  hint,
}: {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode; description?: string }>;
  columns?: 2 | 3 | 4;
  required?: boolean;
  hint?: string;
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns];
  return (
    <Field label={label} required={required} hint={hint}>
      <div className={cn('grid grid-cols-2 gap-2.5', cols)}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                'group flex flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition-all focus-ring',
                active
                  ? 'border-primary bg-primary-50/70 shadow-[0_0_0_3px_rgba(108,60,233,0.08)]'
                  : 'border-ink/10 bg-white hover:border-primary/35 hover:bg-primary-50/30',
              )}
            >
              <span className="flex items-center gap-2">
                {option.icon && (
                  <span className={cn('text-base', active ? 'text-primary' : 'text-ink/50')}>{option.icon}</span>
                )}
                <span className={cn('text-sm font-semibold', active ? 'text-primary-700' : 'text-ink/75')}>
                  {option.label}
                </span>
              </span>
              {option.description && (
                <span className="text-xs leading-snug text-ink/50">{option.description}</span>
              )}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-ink/10 bg-white px-4 py-3 text-left transition hover:border-primary/30 focus-ring"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink/50">{description}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-ink/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
