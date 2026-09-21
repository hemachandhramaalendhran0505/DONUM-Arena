import { Link } from 'react-router-dom';
import { Clock, MapPin, Package2 } from 'lucide-react';
import type { Donation } from '@/types';
import { Badge, StatusBadge, UrgencyBadge, VerificationBadge } from '@/components/ui/Badge';
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '@/utils/labels';
import { countdown, isExpiringSoon, relativeTime } from '@/utils/format';
import { donationUrgency } from '@/utils/urgency';
import { formatDistance } from '@/utils/geo';
import { cn } from '@/utils/cn';

interface DonationCardProps {
  donation: Donation;
  distanceKm?: number;
  to?: string;
  footer?: React.ReactNode;
  matchScore?: number;
  className?: string;
  /** Show the derived time-pressure badge (used on NGO browse/triage views). */
  showUrgency?: boolean;
}

export function DonationCard({
  donation,
  distanceKm,
  to,
  footer,
  matchScore,
  className,
  showUrgency,
}: DonationCardProps) {
  const expiring = isExpiringSoon(donation.expiryDate, 24);
  const image = donation.images[0];
  const urgency = donationUrgency(donation);

  const body = (
    <>
      <div className="flex gap-4">
        <div
          className={cn(
            'grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl text-2xl',
            image ? 'bg-ink/5' : 'bg-primary-50',
          )}
        >
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden>{CATEGORY_EMOJI[donation.category]}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">{donation.title}</h3>
            <StatusBadge status={donation.status} className="shrink-0" />
          </div>

          <p className="mt-1 text-sm font-semibold text-primary">
            {donation.quantity} {donation.unit}
            <span className="ml-2 font-medium text-ink/45">{CATEGORY_LABEL[donation.category]}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-ink/50">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="max-w-[170px] truncate">{donation.location.address}</span>
            </span>
            {distanceKm !== undefined && (
              <span className="font-semibold text-ink/65">{formatDistance(distanceKm)}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {relativeTime(donation.pickupDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {showUrgency && <UrgencyBadge urgency={urgency} />}
        {donation.expiryDate && (
          <Badge tone={expiring ? 'danger' : 'muted'}>{countdown(donation.expiryDate)}</Badge>
        )}
        {matchScore !== undefined && (
          <Badge tone="primary">{Math.round(matchScore * 100)}% match</Badge>
        )}
        {donation.foodDetails?.dietary && (
          <Badge tone={donation.foodDetails.dietary === 'non_vegetarian' ? 'warning' : 'success'}>
            {donation.foodDetails.dietary === 'non_vegetarian'
              ? 'Non-veg'
              : donation.foodDetails.dietary === 'vegan'
                ? 'Vegan'
                : donation.foodDetails.dietary === 'mixed'
                  ? 'Mixed'
                  : 'Veg'}
          </Badge>
        )}
        <VerificationBadge status={donation.donorVerification} compact />
      </div>

      {footer && <div className="mt-4 border-t border-ink/5 pt-3.5">{footer}</div>}
    </>
  );

  const shell = cn(
    'block rounded-2xl border border-ink/5 bg-white p-4 shadow-soft transition-all duration-300',
    to && 'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift',
    className,
  );

  return to ? (
    <Link to={to} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

export function DonationCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink/5 bg-white p-4 shadow-soft">
      <div className="flex gap-4">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-ink/6" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-ink/6" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-ink/6" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-ink/6" />
        </div>
      </div>
    </div>
  );
}

export function EmptyGridIcon() {
  return <Package2 className="h-6 w-6" />;
}
