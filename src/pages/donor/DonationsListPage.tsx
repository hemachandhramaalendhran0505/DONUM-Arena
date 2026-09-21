import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackagePlus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { DonationCard } from '@/components/common/DonationCard';
import { Card, EmptyState } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { TimelineStrip } from '@/components/common/Timeline';
import { DONATION_LIFECYCLE, DONATION_STATUS_LABEL } from '@/utils/labels';
import { cn } from '@/utils/cn';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Closed' },
] as const;

const ACTIVE = new Set(['created', 'matching', 'matched', 'accepted', 'pickup_scheduled', 'picked_up', 'delivered']);
const CLOSED = new Set(['cancelled', 'expired', 'rejected']);

export function DonationsListPage() {
  const { user } = useAuth();
  const { donations } = useData();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const filter = (params.get('filter') ?? 'all') as (typeof FILTERS)[number]['key'];

  const mine = useMemo(
    () => donations.filter((d) => d.donorId === user?.id),
    [donations, user?.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((d) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'active'
            ? ACTIVE.has(d.status)
            : filter === 'completed'
              ? d.status === 'completed'
              : CLOSED.has(d.status);
      const matchesQuery = !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [mine, filter, query]);

  const steps = DONATION_LIFECYCLE.map((s) => ({ key: s, label: DONATION_STATUS_LABEL[s] }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">My donations</h1>
          <p className="mt-1.5 text-sm text-ink/55">
            {mine.length} donation{mine.length === 1 ? '' : 's'} · track every step from listing to delivery.
          </p>
        </div>
        <LinkButton to="/app/donations/new" icon={<PackagePlus className="h-4.5 w-4.5" />}>
          Add Donation
        </LinkButton>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setParams(f.key === 'all' ? {} : { filter: f.key })}
              className={cn(
                'whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-ring',
                filter === f.key
                  ? 'bg-primary text-white shadow-lift'
                  : 'bg-white text-ink/60 ring-1 ring-ink/5 hover:bg-primary-50 hover:text-primary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search your donations"
          icon={<Search className="h-4 w-4" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          wrapperClassName="sm:ml-auto sm:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<PackagePlus className="h-6 w-6" />}
            title={mine.length === 0 ? 'No donations yet' : 'Nothing matches this filter'}
            description={
              mine.length === 0
                ? 'List your surplus and DONUM will find the right receiver within seconds.'
                : 'Try a different filter or search term.'
            }
            action={mine.length === 0 ? <LinkButton to="/app/donations/new">Add your first donation</LinkButton> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((donation) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              to={`/app/donations/${donation.id}`}
              matchScore={donation.matchScore}
              footer={
                <TimelineStrip
                  steps={steps}
                  currentStatus={donation.status}
                  failed={CLOSED.has(donation.status)}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
