/**
 * Impact analytics — headline metrics plus donations by category, donations
 * over time and impact by location.
 */
import { useMemo, useState } from 'react';
import {
  BarChart3,
  Bike,
  Leaf,
  MapPinned,
  PackageCheck,
  PieChart,
  Recycle,
  Route,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Stat } from '@/components/ui/Stat';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { AreaChart, BarChart, CHART_COLORS, DonutChart, ProgressRows } from '@/components/charts/Charts';
import {
  buildImpactSummary,
  donationsByCategory,
  donationsOverTime,
  impactByLocation,
} from '@/features/analytics/impact';
import { CATEGORY_LABEL } from '@/utils/labels';
import { compactNumber, percent } from '@/utils/format';
import { cn } from '@/utils/cn';

const SCOPES = [
  { key: 'mine', label: 'My impact' },
  { key: 'platform', label: 'Platform-wide' },
] as const;

export function ImpactPage() {
  const { user } = useAuth();
  const { donations, tasks } = useData();
  const [scope, setScope] = useState<(typeof SCOPES)[number]['key']>('mine');

  const scoped = useMemo(() => {
    if (scope === 'platform' || !user) return { donations, tasks };
    switch (user.role) {
      case 'donor':
        return {
          donations: donations.filter((d) => d.donorId === user.id),
          tasks: tasks.filter((t) => donations.some((d) => d.id === t.donationId && d.donorId === user.id)),
        };
      case 'volunteer': {
        const mine = tasks.filter((t) => t.volunteerId === user.id);
        return {
          donations: donations.filter((d) => mine.some((t) => t.donationId === d.id)),
          tasks: mine,
        };
      }
      default:
        return {
          donations: donations.filter((d) => d.matchedReceiverId === user.id),
          tasks: tasks.filter((t) => donations.some((d) => d.id === t.donationId && d.matchedReceiverId === user.id)),
        };
    }
  }, [scope, user, donations, tasks]);

  const summary = useMemo(
    () => buildImpactSummary(scoped.donations, scoped.tasks),
    [scoped],
  );
  const byCategory = useMemo(() => donationsByCategory(scoped.donations), [scoped.donations]);
  const overTime = useMemo(() => donationsOverTime(scoped.donations, 8), [scoped.donations]);
  const byLocation = useMemo(() => impactByLocation(scoped.donations), [scoped.donations]);

  const hasData = scoped.donations.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Impact dashboard</h1>
          <p className="mt-1.5 text-sm text-ink/55">
            Outcomes measured from real completed deliveries — not intentions.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-white p-1 ring-1 ring-ink/5">
          {SCOPES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setScope(option.key)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition',
                scope === option.key ? 'bg-primary text-white shadow-soft' : 'text-ink/55 hover:bg-ink/4',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <Card padded={false}>
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="No impact data yet"
            description="Once donations are completed, your metrics and charts will appear here."
          />
        </Card>
      ) : (
        <>
          {/* Headline metrics */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total Donations" value={summary.totalDonations} icon={<PackageCheck className="h-4.5 w-4.5" />} />
            <Stat
              label="Successful Donations"
              value={summary.successfulDonations}
              icon={<TrendingUp className="h-4.5 w-4.5" />}
              tone="success"
              trend={`${percent(summary.completionRate)} completion rate`}
            />
            <Stat label="People Reached" value={summary.peopleReached} icon={<Users className="h-4.5 w-4.5" />} />
            <Stat
              label="Resources Distributed"
              value={summary.resourcesDistributed}
              icon={<Recycle className="h-4.5 w-4.5" />}
            />
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat
              label="Volunteer Hours"
              value={summary.volunteerHours}
              suffix="hrs"
              icon={<Timer className="h-4.5 w-4.5" />}
              tone="warning"
            />
            <Stat
              label="Distance Covered"
              value={summary.distanceSavedKm}
              suffix="km"
              icon={<Route className="h-4.5 w-4.5" />}
            />
            <Stat
              label="Waste Diverted"
              value={summary.wasteDivertedKg}
              suffix="kg"
              icon={<Leaf className="h-4.5 w-4.5" />}
              tone="success"
            />
          </section>

          {/* Charts */}
          <section className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Donations by category"
                subtitle="Where surplus is coming from"
                icon={<PieChart className="h-4.5 w-4.5" />}
              />
              <DonutChart
                centerLabel="donations"
                data={byCategory.map((bucket, i) => ({
                  label: CATEGORY_LABEL[bucket.category],
                  value: bucket.count,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
              />
            </Card>

            <Card>
              <CardHeader
                title="Donations over time"
                subtitle="Last 8 weeks · listed vs completed"
                icon={<TrendingUp className="h-4.5 w-4.5" />}
              />
              <AreaChart
                data={overTime.map((bucket) => ({
                  label: bucket.label,
                  value: bucket.donations,
                  secondary: bucket.completed,
                }))}
              />
              <div className="mt-3 flex items-center gap-5 text-xs font-medium text-ink/55">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-primary" />
                  Listed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-success" />
                  Completed
                </span>
              </div>
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Quantity by category"
                subtitle="Total units distributed"
                icon={<BarChart3 className="h-4.5 w-4.5" />}
              />
              <BarChart
                data={byCategory.map((bucket) => ({
                  label: CATEGORY_LABEL[bucket.category].split(' ')[0],
                  value: bucket.quantity,
                }))}
              />
            </Card>

            <Card>
              <CardHeader
                title="Impact by location"
                subtitle="People reached per area"
                icon={<MapPinned className="h-4.5 w-4.5" />}
              />
              {byLocation.length === 0 ? (
                <EmptyState icon={<MapPinned className="h-6 w-6" />} title="No completed deliveries yet" />
              ) : (
                <ProgressRows
                  rows={byLocation.map((bucket, i) => ({
                    label: bucket.city,
                    value: bucket.peopleReached,
                    sublabel: `· ${bucket.count} donations`,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                />
              )}
            </Card>
          </section>

          {/* Narrative summary */}
          <Card className="border-primary/15 bg-gradient-to-br from-primary-50/70 to-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-lift">
                <Bike className="h-5.5 w-5.5" />
              </span>
              <p className="text-sm leading-relaxed text-ink/70">
                {scope === 'mine' ? 'You have' : 'The DONUM community has'} completed{' '}
                <span className="font-bold text-ink">{summary.successfulDonations} donations</span>, reaching{' '}
                <span className="font-bold text-ink">{compactNumber(summary.peopleReached)} people</span> and diverting an
                estimated <span className="font-bold text-ink">{compactNumber(summary.wasteDivertedKg)} kg</span> of usable
                resources from waste — supported by{' '}
                <span className="font-bold text-ink">{summary.volunteerHours} volunteer hours</span> across{' '}
                <span className="font-bold text-ink">{compactNumber(summary.distanceSavedKm)} km</span> travelled.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
