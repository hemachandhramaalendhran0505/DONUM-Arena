import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Package, Sparkles, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, RequestStatusBadge, UrgencyBadge, VerificationBadge } from '@/components/ui/Badge';
import { Timeline } from '@/components/common/Timeline';
import { MapView, MapLegend } from '@/components/map/MapView';
import { MatchExplanation } from '@/features/matching/MatchExplanation';
import { DonationCard } from '@/components/common/DonationCard';
import { useToast } from '@/context/ToastContext';
import { cancelRequest } from '@/services/requestService';
import { createManualMatch } from '@/services/matchService';
import { rankDonationsForRequest, type RankedMatch } from '@/features/matching/engine';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  REQUEST_LIFECYCLE,
  REQUEST_STATUS_LABEL,
} from '@/utils/labels';
import { formatDate, formatDateTime, relativeTime } from '@/utils/format';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { requests, donations } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<RankedMatch[]>([]);

  const request = requests.find((r) => r.id === id);

  const matchedDonations = useMemo(
    () => donations.filter((d) => request?.matchedDonationIds.includes(d.id)),
    [donations, request],
  );

  useEffect(() => {
    if (!request) return;
    setCandidates(rankDonationsForRequest(request, donations, { limit: 4 }));
  }, [request, donations]);

  if (!request) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-ink/55">
          This request could not be found.{' '}
          <Link to="/app/requests" className="font-bold text-primary">
            Back to requests
          </Link>
        </p>
      </Card>
    );
  }

  const isOwner = user?.id === request.requestorId;
  const steps = REQUEST_LIFECYCLE.map((s) => ({ key: s, label: REQUEST_STATUS_LABEL[s] }));
  const progress = Math.min(1, request.fulfilledQuantity / Math.max(1, request.quantity));

  const requestDonation = async (match: RankedMatch) => {
    setBusy(true);
    try {
      await createManualMatch(match.donation, request);
      toast('Request sent to the donor.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await cancelRequest(request, 'Cancelled by the requestor.');
      toast('Request cancelled.', 'info');
      navigate('/app/requests');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-3xl">
                  {CATEGORY_EMOJI[request.category]}
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{request.title}</h1>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {request.quantity} {request.unit}
                    <span className="ml-2 font-medium text-ink/45">{CATEGORY_LABEL[request.category]}</span>
                  </p>
                </div>
              </div>
              <RequestStatusBadge status={request.status} />
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink/65">{request.description}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <UrgencyBadge urgency={request.urgency} />
              <Badge tone="muted" icon={<Users className="h-3 w-3" />}>
                {request.beneficiaryCount} people
              </Badge>
              <Badge tone="muted">
                Needed by {formatDate(request.requiredBy)} · {relativeTime(request.requiredBy)}
              </Badge>
            </div>

            <div className="mt-5 space-y-2 border-t border-ink/5 pt-5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-ink/55">Fulfilled</span>
                <span className="text-ink">
                  {request.fulfilledQuantity} / {request.quantity} {request.unit}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/8">
                <div
                  className="h-full rounded-full bg-success transition-all duration-700"
                  style={{ width: `${Math.max(3, progress * 100)}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Matched donations */}
          {matchedDonations.length > 0 && (
            <Card>
              <CardHeader
                title="Matched donations"
                subtitle={`${matchedDonations.length} donation${matchedDonations.length > 1 ? 's' : ''} routed to this request`}
                icon={<Package className="h-4.5 w-4.5" />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {matchedDonations.map((donation) => (
                  <DonationCard key={donation.id} donation={donation} to={`/app/donations/${donation.id}`} />
                ))}
              </div>
            </Card>
          )}

          {/* Suggested */}
          {isOwner && request.status !== 'completed' && request.status !== 'cancelled' && (
            <Card>
              <CardHeader
                title="Donations DONUM suggests"
                subtitle="Scored on distance, urgency, category, quantity and expiry"
                icon={<Sparkles className="h-4.5 w-4.5" />}
              />
              {candidates.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="h-6 w-6" />}
                  title="No suitable donations right now"
                  description="DONUM keeps searching. You'll be notified the moment something matches."
                />
              ) : (
                <div className="space-y-4">
                  {candidates.map((candidate) => (
                    <div key={candidate.donation.id} className="rounded-2xl border border-ink/5 bg-surface/50 p-4">
                      <DonationCard
                        donation={candidate.donation}
                        distanceKm={candidate.distanceKm}
                        to={`/app/donations/${candidate.donation.id}`}
                        className="border-0 bg-transparent p-0 shadow-none"
                      />
                      <MatchExplanation breakdown={candidate} compact className="mt-3.5" />
                      <Button
                        size="sm"
                        fullWidth
                        className="mt-3"
                        loading={busy}
                        onClick={() => void requestDonation(candidate)}
                      >
                        Request this donation
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Delivery location" icon={<MapPin className="h-4.5 w-4.5" />} />
            <MapView
              markers={[
                { id: 'request', ...request.location, label: request.requestorName, kind: 'request', active: true },
                ...matchedDonations.map((d) => ({
                  id: d.id,
                  latitude: d.location.latitude,
                  longitude: d.location.longitude,
                  label: d.donorName,
                  kind: 'donation' as const,
                })),
              ]}
            />
            <div className="mt-3.5">
              <MapLegend
                items={[
                  { kind: 'request', label: 'Your location' },
                  ...(matchedDonations.length ? [{ kind: 'donation' as const, label: 'Matched donor' }] : []),
                ]}
              />
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm text-ink/60">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink/35" />
              {request.location.address}
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Request timeline" icon={<Clock className="h-4.5 w-4.5" />} />
            <Timeline
              steps={steps}
              events={request.timeline}
              currentStatus={request.status}
              failed={request.status === 'cancelled'}
            />
          </Card>

          <Card>
            <CardHeader title="Requested by" icon={<Users className="h-4.5 w-4.5" />} />
            <p className="text-sm font-bold text-ink">{request.requestorName}</p>
            <p className="mt-0.5 text-xs capitalize text-ink/50">{request.requestorRole}</p>
            <div className="mt-2.5">
              <VerificationBadge status={request.requestorVerification} />
            </div>
            <p className="mt-3 text-xs text-ink/45">Created {formatDateTime(request.createdAt)}</p>
          </Card>

          {isOwner && request.status !== 'completed' && request.status !== 'cancelled' && (
            <Card>
              <CardHeader title="Actions" />
              <Button
                fullWidth
                variant="ghost"
                className="text-danger hover:bg-danger/5"
                loading={busy}
                onClick={handleCancel}
                icon={<X className="h-4.5 w-4.5" />}
              >
                Cancel request
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
