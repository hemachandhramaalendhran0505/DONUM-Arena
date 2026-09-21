import { Check, X } from 'lucide-react';
import type { StatusEvent } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

interface TimelineProps {
  /** Full lifecycle in order, e.g. DONATION_LIFECYCLE. */
  steps: Array<{ key: string; label: string }>;
  /** Events that have actually happened. */
  events: StatusEvent[];
  currentStatus: string;
  /** Renders the track in red when the flow ended in failure. */
  failed?: boolean;
}

export function Timeline({ steps, events, currentStatus, failed }: TimelineProps) {
  const eventByStatus = new Map(events.map((e) => [e.status, e]));
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);
  const failureEvent = failed ? events[events.length - 1] : undefined;

  return (
    <ol className="relative space-y-0">
      {steps.map((step, index) => {
        const event = eventByStatus.get(step.key);
        const done = currentIndex >= 0 ? index <= currentIndex : Boolean(event);
        const isCurrent = index === currentIndex && !failed;
        const isLast = index === steps.length - 1 && !failed;

        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[13px] top-7 h-[calc(100%-14px)] w-0.5 rounded',
                  done && index < currentIndex ? 'bg-primary' : 'bg-ink/10',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 mt-0.5 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border-2 transition-colors',
                done
                  ? 'border-primary bg-primary text-white'
                  : 'border-ink/15 bg-white text-transparent',
                isCurrent && 'ring-4 ring-primary/15',
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  done ? 'text-ink' : 'text-ink/35',
                  isCurrent && 'text-primary-700',
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Current
                  </span>
                )}
              </p>
              {event && (
                <>
                  <p className="mt-0.5 text-xs text-ink/45">{formatDateTime(event.at)}</p>
                  {event.note && <p className="mt-1 text-xs leading-relaxed text-ink/60">{event.note}</p>}
                </>
              )}
            </div>
          </li>
        );
      })}

      {failed && failureEvent && (
        <li className="relative flex gap-4">
          <span className="relative z-10 mt-0.5 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border-2 border-danger bg-danger text-white">
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-semibold text-danger">{failureEvent.label}</p>
            <p className="mt-0.5 text-xs text-ink/45">{formatDateTime(failureEvent.at)}</p>
            {failureEvent.note && <p className="mt-1 text-xs text-ink/60">{failureEvent.note}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}

/** Compact horizontal progress used inside list cards. */
export function TimelineStrip({
  steps,
  currentStatus,
  failed,
}: {
  steps: Array<{ key: string; label: string }>;
  currentStatus: string;
  failed?: boolean;
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);
  const progress = failed ? 1 : currentIndex < 0 ? 0 : (currentIndex + 1) / steps.length;

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
        <div
          className={cn('h-full rounded-full transition-all duration-700', failed ? 'bg-danger' : 'bg-primary')}
          style={{ width: `${Math.max(6, progress * 100)}%` }}
        />
      </div>
      <p className="text-xs font-medium text-ink/50">
        {failed
          ? 'Ended early'
          : `Step ${Math.max(1, currentIndex + 1)} of ${steps.length} · ${steps[Math.max(0, currentIndex)]?.label ?? ''}`}
      </p>
    </div>
  );
}
