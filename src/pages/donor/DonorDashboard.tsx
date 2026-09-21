import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Heart,
  Leaf,
  PackageCheck,
  PackagePlus,
  Route,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Stat } from '@/components/ui/Stat';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { DonationCard } from '@/components/common/DonationCard';
import { buildImpactSummary } from '@/features/analytics/impact';
import { greeting } from '@/utils/format';
import { MatchExplanation } from '@/features/matching/MatchExplanation';
import { TimelineStrip } from '@/components/common/Timeline';
import { DONATION_LIFECYCLE, DONATION_STATUS_LABEL } from '@/utils/labels';

const ACTIVE = new Set(['created', 'matching', 'matched', 'accepted', 'pickup_scheduled', 'picked_up', 'delivered']);

export function DonorDashboard() {
  const { user } = useAuth();
  const { donations, tasks, matches } = useData();

  const mine = useMemo(
    () => donations.filter((d) => d.donorId === user?.id),
    [donations, user?.id],
  );
  const active = useMemo(() => mine.filter((d) => ACTIVE.has(d.status)), [mine]);
  const myTasks = useMemo(
    () => tasks.filter((t) => mine.some((d) => d.id === t.donationId)),
    [tasks, mine],
  );
  const stats = useMemo(() => buildImpactSummary(mine, myTasks), [mine, myTasks]);

  const latestMatch = useMemo(() => {
    const ids = new Set(mine.map((d) => d.id));
    return matches
      .filter((m) => ids.has(m.donationId))
      .sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [matches, mine]);

  const steps = DONATION_LIFECYCLE.map((s) => ({ key: s, label: DONATION_STATUS_LABEL[s] }));

  return (
    <div className="space-y-7">
      {/* Header */}
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-700 p-6 text-white shadow-glow sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-white/70">
              {greeting()}, {user?.name.split(' ')[0]}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Make an impact today.
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/60">
              {active.length > 0
                ? `You have ${active.length} active donation${active.length > 1 ? 's' : ''} in progress.`
                : 'Every item you list is one less thing wasted, and one more person helped.'}
            </p>
          </div>
          <LinkButton
            to="/app/donations/new"
            size="lg"
            className="bg-white text-primary shadow-none hover:bg-white/90"
            icon={<PackagePlus className="h-5 w-5" />}
          >
            Add Donation
          </LinkButton>
        </div>
      </header>

      {/* Quick actions */}
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction to="/app/donations/new" icon={PackagePlus} label="Add Donation" primary />
          <QuickAction to="/app/donations?filter=active" icon={Route} label="Track Donations" />
          <QuickAction to="/app/donations" icon={ClipboardList} label="Donation History" />
          <QuickAction to="/app/impact" icon={BarChart3} label="Impact" />
        </div>
      </section>

      {/* Latest match */}
      {latestMatch && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Latest match</h2>
          <Card>
            <CardHeader
              title={latestMatch.donationTitle}
              subtitle={`Matched with ${latestMatch.receiverName}`}
              icon={<Heart className="h-4.5 w-4.5" />}
              action={
                <Link
                  to={`/app/donations/${latestMatch.donationId}`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-700"
                >
                  View
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            <MatchExplanation breakdown={latestMatch} />
          </Card>
        </section>
      )}

      {/* Active donations */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Active donations</h2>
          <Link to="/app/donations" className="text-sm font-semibold text-primary hover:text-primary-700">
            View all
          </Link>
        </div>

        {active.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={<PackagePlus className="h-6 w-6" />}
              title="No active donations"
              description="List your surplus and DONUM will find the right receiver within seconds."
              action={<LinkButton to="/app/donations/new">Add your first donation</LinkButton>}
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {active.slice(0, 4).map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                to={`/app/donations/${donation.id}`}
                matchScore={donation.matchScore}
                footer={<TimelineStrip steps={steps} currentStatus={donation.status} />}
              />
            ))}
          </div>
        )}
      </section>

      {/* Impact */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Your impact</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total Donations" value={stats.totalDonations} icon={<PackagePlus className="h-4.5 w-4.5" />} />
          <Stat
            label="Successful Donations"
            value={stats.successfulDonations}
            icon={<PackageCheck className="h-4.5 w-4.5" />}
            tone="success"
          />
          <Stat label="People Helped" value={stats.peopleReached} icon={<Users className="h-4.5 w-4.5" />} />
          <Stat
            label="Waste Diverted"
            value={stats.wasteDivertedKg}
            suffix="kg"
            icon={<Leaf className="h-4.5 w-4.5" />}
            tone="success"
          />
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  primary,
}: {
  to: string;
  icon: typeof PackagePlus;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${
        primary
          ? 'border-primary/20 bg-primary-50/70 hover:border-primary/40'
          : 'border-ink/5 bg-white hover:border-primary/20'
      }`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl transition ${
          primary ? 'bg-primary text-white' : 'bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-bold text-ink">{label}</span>
    </Link>
  );
}
