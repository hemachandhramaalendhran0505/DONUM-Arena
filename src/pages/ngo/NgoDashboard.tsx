import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  HandHeart,
  ListChecks,
  PackageCheck,
  Siren,
  Truck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Stat } from '@/components/ui/Stat';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { DonationCard } from '@/components/common/DonationCard';
import { Badge, RequestStatusBadge, UrgencyBadge, VerificationBadge } from '@/components/ui/Badge';
import { buildImpactSummary, buildRequestStats } from '@/features/analytics/impact';
import { greeting, relativeTime } from '@/utils/format';
import { roadDistanceKm } from '@/utils/geo';
import { rankDonationsForRequest } from '@/features/matching/engine';
import { acceptDonation } from '@/features/donations/donationService';
import { useToast } from '@/context/ToastContext';

const OPEN = new Set(['created', 'matching', 'matched']);

export function NgoDashboard() {
  const { user } = useAuth();
  const { donations, requests, tasks } = useData();
  const { toast } = useToast();

  const myRequests = useMemo(
    () => requests.filter((r) => r.requestorId === user?.id),
    [requests, user?.id],
  );
  const received = useMemo(
    () => donations.filter((d) => d.matchedReceiverId === user?.id),
    [donations, user?.id],
  );
  const available = useMemo(
    () => donations.filter((d) => OPEN.has(d.status) && d.donorId !== user?.id),
    [donations, user?.id],
  );
  const matched = received.filter((d) => ['matched', 'accepted'].includes(d.status));
  const pendingPickups = received.filter((d) =>
    ['accepted', 'pickup_scheduled', 'picked_up'].includes(d.status),
  );
  const completed = received.filter((d) => d.status === 'completed');

  const stats = useMemo(() => buildImpactSummary(received, tasks), [received, tasks]);
  const requestStats = useMemo(() => buildRequestStats(myRequests), [myRequests]);

  // Best available donations for this NGO's most urgent open request.
  const topRequest = myRequests
    .filter((r) => r.status === 'created' || r.status === 'searching' || r.status === 'matched')
    .sort((a, b) => b.beneficiaryCount - a.beneficiaryCount)[0];

  const recommendations = useMemo(
    () => (topRequest ? rankDonationsForRequest(topRequest, available, { limit: 3 }) : []),
    [topRequest, available],
  );

  const accept = async (donationId: string) => {
    const donation = donations.find((d) => d.id === donationId);
    if (!donation || !user) return;
    await acceptDonation(donation, user);
    toast('Donation accepted. The donor has been notified.');
  };

  return (
    <div className="space-y-7">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-700 p-6 text-white shadow-glow sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-white/70">
              {greeting()}, {user?.name.split(' ')[0]}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {user?.organizationName ?? 'Your organisation'}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VerificationBadge status={user?.verificationStatus ?? 'pending'} />
              {requestStats.criticalOpen > 0 && (
                <Badge tone="danger" icon={<Siren className="h-3 w-3" />}>
                  {requestStats.criticalOpen} critical request{requestStats.criticalOpen > 1 ? 's' : ''} open
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2.5">
            <LinkButton
              to="/app/browse"
              className="bg-white text-primary shadow-none hover:bg-white/90"
              icon={<Compass className="h-4.5 w-4.5" />}
            >
              Browse
            </LinkButton>
            <LinkButton
              to="/app/requests/new"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              icon={<HandHeart className="h-4.5 w-4.5" />}
            >
              New request
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Overview */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Available" value={available.length} icon={<Compass className="h-4.5 w-4.5" />} />
        <Stat label="Active Requests" value={requestStats.open} icon={<ListChecks className="h-4.5 w-4.5" />} />
        <Stat label="Matched" value={matched.length} icon={<HandHeart className="h-4.5 w-4.5" />} />
        <Stat label="Pending Pickups" value={pendingPickups.length} icon={<Truck className="h-4.5 w-4.5" />} tone="warning" />
        <Stat label="Completed" value={completed.length} icon={<PackageCheck className="h-4.5 w-4.5" />} tone="success" />
        <Stat label="People Reached" value={stats.peopleReached} icon={<Users className="h-4.5 w-4.5" />} />
      </section>

      {/* Recommended */}
      {topRequest && recommendations.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Recommended for you</h2>
              <p className="text-sm text-ink/55">
                Best matches for “{topRequest.title}”
              </p>
            </div>
            <Link to="/app/browse" className="text-sm font-semibold text-primary hover:text-primary-700">
              Browse all
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((rec) => (
              <DonationCard
                key={rec.donation.id}
                donation={rec.donation}
                distanceKm={rec.distanceKm}
                matchScore={rec.matchScore}
                to={`/app/donations/${rec.donation.id}`}
                footer={
                  <div className="space-y-2.5">
                    <p className="text-xs leading-relaxed text-ink/55">{rec.explanation}</p>
                    <Button
                      size="sm"
                      fullWidth
                      onClick={(e) => {
                        e.preventDefault();
                        void accept(rec.donation.id);
                      }}
                      icon={<BadgeCheck className="h-4 w-4" />}
                    >
                      Accept
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Requests + pickups */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your requests"
            subtitle={`${requestStats.open} open · ${requestStats.fulfilled} fulfilled`}
            icon={<ListChecks className="h-4.5 w-4.5" />}
            action={
              <Link to="/app/requests" className="text-sm font-semibold text-primary hover:text-primary-700">
                All
              </Link>
            }
          />
          {myRequests.length === 0 ? (
            <EmptyState
              icon={<HandHeart className="h-6 w-6" />}
              title="No requests yet"
              description="Tell DONUM what you need and matching donations will come to you."
              action={<LinkButton to="/app/requests/new" size="sm">Create a request</LinkButton>}
            />
          ) : (
            <ul className="space-y-2.5">
              {myRequests.slice(0, 4).map((request) => (
                <li key={request.id}>
                  <Link
                    to={`/app/requests/${request.id}`}
                    className="flex items-center gap-3 rounded-xl border border-ink/5 bg-surface/50 p-3.5 transition hover:border-primary/25 hover:bg-white hover:shadow-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{request.title}</p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {request.fulfilledQuantity}/{request.quantity} {request.unit} ·{' '}
                        {request.beneficiaryCount} people
                      </p>
                    </div>
                    <UrgencyBadge urgency={request.urgency} />
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink/25" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Pending pickups"
            subtitle="Donations on their way to you"
            icon={<Truck className="h-4.5 w-4.5" />}
          />
          {pendingPickups.length === 0 ? (
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title="Nothing in transit"
              description="Accepted donations awaiting collection will appear here."
            />
          ) : (
            <ul className="space-y-2.5">
              {pendingPickups.slice(0, 4).map((donation) => {
                const distance = user
                  ? roadDistanceKm(donation.location, {
                      latitude: user.latitude,
                      longitude: user.longitude,
                    })
                  : 0;
                return (
                  <li key={donation.id}>
                    <Link
                      to={`/app/donations/${donation.id}`}
                      className="flex items-center gap-3 rounded-xl border border-ink/5 bg-surface/50 p-3.5 transition hover:border-primary/25 hover:bg-white hover:shadow-soft"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{donation.title}</p>
                        <p className="mt-0.5 text-xs text-ink/50">
                          {donation.quantity} {donation.unit} · {distance.toFixed(1)} km ·{' '}
                          {relativeTime(donation.pickupDate)}
                        </p>
                      </div>
                      <RequestStatusBadge status={donation.status === 'picked_up' ? 'matched' : 'searching'} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
