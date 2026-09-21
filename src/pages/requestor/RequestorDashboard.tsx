import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, HandHeart, ListChecks, Package, Truck, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Stat } from '@/components/ui/Stat';
import { Card, EmptyState } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { RequestStatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import { DonationCard } from '@/components/common/DonationCard';
import { TimelineStrip } from '@/components/common/Timeline';
import { buildRequestStats } from '@/features/analytics/impact';
import { greeting, relativeTime } from '@/utils/format';
import { REQUEST_LIFECYCLE, REQUEST_STATUS_LABEL } from '@/utils/labels';

export function RequestorDashboard() {
  const { user } = useAuth();
  const { requests, donations } = useData();

  const mine = useMemo(
    () => requests.filter((r) => r.requestorId === user?.id),
    [requests, user?.id],
  );
  const incoming = useMemo(
    () => donations.filter((d) => d.matchedReceiverId === user?.id && d.status !== 'completed'),
    [donations, user?.id],
  );
  const received = useMemo(
    () => donations.filter((d) => d.matchedReceiverId === user?.id && d.status === 'completed'),
    [donations, user?.id],
  );

  const stats = useMemo(() => buildRequestStats(mine), [mine]);
  const steps = REQUEST_LIFECYCLE.map((s) => ({ key: s, label: REQUEST_STATUS_LABEL[s] }));

  return (
    <div className="space-y-7">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-700 p-6 text-white shadow-glow sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-white/70">
              {greeting()}, {user?.name.split(' ')[0]}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {incoming.length > 0 ? 'Help is on the way.' : 'Tell us what you need.'}
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/60">
              {incoming.length > 0
                ? `${incoming.length} donation${incoming.length > 1 ? 's are' : ' is'} being routed to you right now.`
                : 'Create a request and DONUM will match you with nearby surplus automatically.'}
            </p>
          </div>
          <LinkButton
            to="/app/requests/new"
            size="lg"
            className="bg-white text-primary shadow-none hover:bg-white/90"
            icon={<HandHeart className="h-5 w-5" />}
          >
            New request
          </LinkButton>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open Requests" value={stats.open} icon={<ListChecks className="h-4.5 w-4.5" />} />
        <Stat label="Matched" value={stats.matched} icon={<Package className="h-4.5 w-4.5" />} />
        <Stat label="Fulfilled" value={stats.fulfilled} icon={<CheckCircle2 className="h-4.5 w-4.5" />} tone="success" />
        <Stat label="People Supported" value={stats.beneficiaries} icon={<Users className="h-4.5 w-4.5" />} />
      </section>

      {incoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">On the way to you</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {incoming.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                to={`/app/donations/${donation.id}`}
                footer={
                  <p className="flex items-center gap-2 text-xs font-semibold text-ink/55">
                    <Truck className="h-4 w-4 text-primary" />
                    Pickup {relativeTime(donation.pickupDate)} · from {donation.donorName}
                  </p>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Your requests</h2>
          <Link to="/app/requests" className="text-sm font-semibold text-primary hover:text-primary-700">
            View all
          </Link>
        </div>

        {mine.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={<HandHeart className="h-6 w-6" />}
              title="No requests yet"
              description="Tell DONUM what you need — food, groceries, clothes or essentials — and nearby surplus will be matched to you."
              action={<LinkButton to="/app/requests/new">Create your first request</LinkButton>}
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mine.slice(0, 4).map((request) => (
              <Link
                key={request.id}
                to={`/app/requests/${request.id}`}
                className="group rounded-2xl border border-ink/5 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">{request.title}</h3>
                  <RequestStatusBadge status={request.status} />
                </div>
                <p className="mt-1.5 text-sm font-semibold text-primary">
                  {request.fulfilledQuantity}/{request.quantity} {request.unit}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <UrgencyBadge urgency={request.urgency} />
                  <span className="text-xs font-medium text-ink/50">
                    {request.beneficiaryCount} people · needed {relativeTime(request.requiredBy)}
                  </span>
                </div>
                <div className="mt-4 border-t border-ink/5 pt-3.5">
                  <TimelineStrip steps={steps} currentStatus={request.status} failed={request.status === 'cancelled'} />
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                  Track request
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {received.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Received</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {received.slice(0, 4).map((donation) => (
              <DonationCard key={donation.id} donation={donation} to={`/app/donations/${donation.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
