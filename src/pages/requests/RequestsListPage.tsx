import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HandHeart, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, EmptyState } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { RequestStatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import { TimelineStrip } from '@/components/common/Timeline';
import { CATEGORY_EMOJI, CATEGORY_LABEL, REQUEST_LIFECYCLE, REQUEST_STATUS_LABEL } from '@/utils/labels';
import { formatDate, relativeTime } from '@/utils/format';

export function RequestsListPage() {
  const { user } = useAuth();
  const { requests } = useData();

  const mine = useMemo(
    () => requests.filter((r) => r.requestorId === user?.id),
    [requests, user?.id],
  );

  const steps = REQUEST_LIFECYCLE.map((s) => ({ key: s, label: REQUEST_STATUS_LABEL[s] }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">My requests</h1>
          <p className="mt-1.5 text-sm text-ink/55">
            {mine.length} request{mine.length === 1 ? '' : 's'} · DONUM keeps searching until they're fulfilled.
          </p>
        </div>
        <LinkButton to="/app/requests/new" icon={<HandHeart className="h-4.5 w-4.5" />}>
          New request
        </LinkButton>
      </div>

      {mine.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<HandHeart className="h-6 w-6" />}
            title="No requests yet"
            description="Tell DONUM what your community needs and matching donations will find you."
            action={<LinkButton to="/app/requests/new">Create your first request</LinkButton>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((request) => {
            const progress = Math.min(1, request.fulfilledQuantity / Math.max(1, request.quantity));
            return (
              <Link
                key={request.id}
                to={`/app/requests/${request.id}`}
                className="group rounded-2xl border border-ink/5 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3.5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-2xl">
                      {CATEGORY_EMOJI[request.category]}
                    </span>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">{request.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {request.quantity} {request.unit}
                        <span className="ml-2 font-medium text-ink/45">{CATEGORY_LABEL[request.category]}</span>
                      </p>
                    </div>
                  </div>
                  <RequestStatusBadge status={request.status} />
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <UrgencyBadge urgency={request.urgency} />
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/50">
                    <Users className="h-3.5 w-3.5" />
                    {request.beneficiaryCount} people
                  </span>
                  <span className="text-xs font-medium text-ink/50">
                    Needed by {formatDate(request.requiredBy)} · {relativeTime(request.requiredBy)}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-ink/55">Fulfilled</span>
                    <span className="text-ink">
                      {request.fulfilledQuantity}/{request.quantity} {request.unit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink/8">
                    <div
                      className="h-full rounded-full bg-success transition-all duration-700"
                      style={{ width: `${Math.max(3, progress * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 border-t border-ink/5 pt-3.5">
                  <TimelineStrip steps={steps} currentStatus={request.status} failed={request.status === 'cancelled'} />
                </div>

                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                  View details
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
