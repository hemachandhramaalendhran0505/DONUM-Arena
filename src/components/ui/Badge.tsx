import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import {
  DONATION_STATUS_LABEL,
  DONATION_STATUS_TONE,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  URGENCY_LABEL,
  URGENCY_TONE,
  VERIFICATION_LABEL,
  VERIFICATION_TONE,
} from '@/utils/labels';
import type {
  DonationStatus,
  RequestStatus,
  TaskStatus,
  Urgency,
  VerificationStatus,
} from '@/types';
import { BadgeCheck, Clock3, ShieldAlert, ShieldX } from 'lucide-react';

export type Tone = 'success' | 'warning' | 'danger' | 'primary' | 'muted';

const TONES: Record<Tone, string> = {
  success: 'bg-success/10 text-emerald-700 ring-success/20',
  warning: 'bg-warning/10 text-amber-700 ring-warning/25',
  danger: 'bg-danger/10 text-red-700 ring-danger/20',
  primary: 'bg-primary/10 text-primary-700 ring-primary/20',
  muted: 'bg-ink/5 text-ink/60 ring-ink/10',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ tone = 'muted', children, icon, className, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: DonationStatus; className?: string }) {
  return (
    <Badge tone={DONATION_STATUS_TONE[status]} className={className}>
      {DONATION_STATUS_LABEL[status]}
    </Badge>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={REQUEST_STATUS_TONE[status]}>{REQUEST_STATUS_LABEL[status]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={TASK_STATUS_TONE[status]}>{TASK_STATUS_LABEL[status]}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <Badge tone={URGENCY_TONE[urgency]} icon={urgency === 'critical' ? <ShieldAlert className="h-3 w-3" /> : undefined}>
      {URGENCY_LABEL[urgency]}
    </Badge>
  );
}

export function VerificationBadge({
  status,
  compact = false,
}: {
  status: VerificationStatus;
  compact?: boolean;
}) {
  const icon =
    status === 'verified' ? (
      <BadgeCheck className="h-3.5 w-3.5" />
    ) : status === 'pending' ? (
      <Clock3 className="h-3.5 w-3.5" />
    ) : status === 'rejected' ? (
      <ShieldX className="h-3.5 w-3.5" />
    ) : undefined;

  return (
    <Badge tone={VERIFICATION_TONE[status]} icon={icon}>
      {compact ? (status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Unverified') : VERIFICATION_LABEL[status]}
    </Badge>
  );
}
