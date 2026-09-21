/**
 * NGO — Browse available donations with distance, category, quantity, urgency,
 * expiry and date filters, plus map/list views.
 */
import { useMemo, useState } from 'react';
import { Check, Compass, Filter, LayoutGrid, Map as MapIcon, Search, Send, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { DonationCard } from '@/components/common/DonationCard';
import { MapView, MapLegend, type MapMarker } from '@/components/map/MapView';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { acceptDonation } from '@/features/donations/donationService';
import { createManualMatch } from '@/features/matching/matchService';
import { CATEGORY_LABEL } from '@/utils/labels';
import { roadDistanceKm } from '@/utils/geo';
import {
  applyBrowse,
  type BrowseSort,
  type ExpiryFilter,
  type PickupWindow,
} from '@/features/donations/browseFilters';
import type { Donation, DonationCategory, Urgency } from '@/types';
import { cn } from '@/utils/cn';

const OPEN = new Set(['created', 'matching', 'matched']);

const DISTANCE_OPTIONS = [
  { value: '0', label: 'Any distance' },
  { value: '2', label: 'Within 2 km' },
  { value: '5', label: 'Within 5 km' },
  { value: '10', label: 'Within 10 km' },
  { value: '20', label: 'Within 20 km' },
];

const EXPIRY_OPTIONS = [
  { value: 'any', label: 'Any expiry' },
  { value: '12', label: 'Expires within 12 h' },
  { value: '24', label: 'Expires within 24 h' },
  { value: '72', label: 'Expires within 3 days' },
  { value: 'none', label: 'No expiry' },
];

const URGENCY_OPTIONS = [
  { value: '', label: 'Any urgency' },
  { value: 'critical', label: 'Critical only' },
  { value: 'high', label: 'High and above' },
  { value: 'medium', label: 'Medium and above' },
];

const DATE_OPTIONS = [
  { value: 'any', label: 'Any pickup date' },
  { value: 'today', label: 'Pickup today' },
  { value: 'tomorrow', label: 'Today or tomorrow' },
  { value: 'week', label: 'Within 7 days' },
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest first' },
  { value: 'urgency', label: 'Most urgent first' },
  { value: 'expiry', label: 'Expiring soonest' },
  { value: 'quantity', label: 'Largest quantity' },
  { value: 'newest', label: 'Newest first' },
];

export function BrowseDonationsPage() {
  const { user } = useAuth();
  const { donations, requests } = useData();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DonationCategory | ''>('');
  const [maxDistance, setMaxDistance] = useState('0');
  const [minQuantity, setMinQuantity] = useState('');
  const [expiry, setExpiry] = useState<ExpiryFilter>('any');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [pickupWindow, setPickupWindow] = useState<PickupWindow>('any');
  const [sort, setSort] = useState<BrowseSort>('distance');
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [requesting, setRequesting] = useState<Donation | null>(null);
  const [busy, setBusy] = useState(false);

  const myRequests = useMemo(
    () => requests.filter((r) => r.requestorId === user?.id && r.status !== 'completed'),
    [requests, user?.id],
  );

  const withDistance = useMemo(() => {
    if (!user) return [];
    return donations
      .filter((d) => OPEN.has(d.status) && d.donorId !== user.id)
      .map((d) => ({
        donation: d,
        distanceKm: roadDistanceKm(d.location, {
          latitude: user.latitude || 12.9716,
          longitude: user.longitude || 77.5946,
        }),
      }));
  }, [donations, user]);

  const filtered = useMemo(
    () =>
      applyBrowse(
        withDistance,
        {
          query,
          category,
          maxDistanceKm: Number(maxDistance) || 0,
          minQuantity: Number(minQuantity) || 0,
          expiry,
          urgency,
          pickupWindow,
        },
        sort,
      ),
    [withDistance, query, category, maxDistance, minQuantity, expiry, urgency, pickupWindow, sort],
  );

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = filtered.map(({ donation }) => ({
      id: donation.id,
      latitude: donation.location.latitude,
      longitude: donation.location.longitude,
      label: donation.title.slice(0, 22),
      kind: 'donation',
    }));
    if (user?.latitude) {
      list.unshift({
        id: 'me',
        latitude: user.latitude,
        longitude: user.longitude,
        label: 'You',
        kind: 'current',
        active: true,
      });
    }
    return list;
  }, [filtered, user]);

  const activeFilterCount =
    (category ? 1 : 0) +
    (maxDistance !== '0' ? 1 : 0) +
    (minQuantity ? 1 : 0) +
    (expiry !== 'any' ? 1 : 0) +
    (urgency ? 1 : 0) +
    (pickupWindow !== 'any' ? 1 : 0);

  const reset = () => {
    setCategory('');
    setMaxDistance('0');
    setMinQuantity('');
    setExpiry('any');
    setUrgency('');
    setPickupWindow('any');
  };

  const handleAccept = async (donation: Donation) => {
    if (!user) return;
    setBusy(true);
    try {
      await acceptDonation(donation, user);
      toast(`Accepted "${donation.title}". The donor has been notified.`);
    } finally {
      setBusy(false);
    }
  };

  const handleRequest = async (requestId: string) => {
    if (!requesting) return;
    const request = myRequests.find((r) => r.id === requestId);
    if (!request) return;
    setBusy(true);
    try {
      await createManualMatch(requesting, request);
      toast('Request sent to the donor.');
      setRequesting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Browse donations</h1>
          <p className="mt-1.5 text-sm text-ink/55">
            {filtered.length} available donation{filtered.length === 1 ? '' : 's'} near you.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-white p-1 ring-1 ring-ink/5">
          {(
            [
              { key: 'grid', icon: LayoutGrid, label: 'List' },
              { key: 'map', icon: MapIcon, label: 'Map' },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setView(option.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                view === option.key ? 'bg-primary text-white shadow-soft' : 'text-ink/55 hover:bg-ink/4',
              )}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search donations"
            icon={<Search className="h-4 w-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            wrapperClassName="flex-1"
          />
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as BrowseSort)}
            options={SORT_OPTIONS}
            wrapperClassName="sm:w-48"
          />
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters((v) => !v)}
            icon={<Filter className="h-4 w-4" />}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-white/25 px-1.5 text-xs font-bold">{activeFilterCount}</span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-4 border-t border-ink/5 pt-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DonationCategory | '')}
              placeholder="All categories"
              options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="Distance"
              value={maxDistance}
              onChange={(e) => setMaxDistance(e.target.value)}
              options={DISTANCE_OPTIONS}
            />
            <Input
              label="Minimum quantity"
              type="number"
              min={0}
              placeholder="Any"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
            />
            <Select label="Expiry" value={expiry} onChange={(e) => setExpiry(e.target.value as ExpiryFilter)} options={EXPIRY_OPTIONS} />
            <Select
              label="Urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency | '')}
              options={URGENCY_OPTIONS}
              hint="Derived from expiry and pickup time."
            />
            <Select
              label="Pickup date"
              value={pickupWindow}
              onChange={(e) => setPickupWindow(e.target.value as PickupWindow)}
              options={DATE_OPTIONS}
            />
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 self-end text-sm font-semibold text-ink/50 transition hover:text-danger"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </Card>

      {view === 'map' && (
        <Card>
          <MapView markers={markers} height="h-[26rem]" />
          <div className="mt-3.5">
            <MapLegend
              items={[
                { kind: 'current', label: 'Your organisation' },
                { kind: 'donation', label: 'Available donation' },
              ]}
            />
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Compass className="h-6 w-6" />}
            title="No donations match your filters"
            description="Try widening the distance or clearing a filter — new surplus is listed all day."
            action={activeFilterCount > 0 ? <Button variant="outline" onClick={reset}>Clear filters</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ donation, distanceKm }) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              distanceKm={distanceKm}
              showUrgency
              to={`/app/donations/${donation.id}`}
              footer={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={busy}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleAccept(donation);
                    }}
                    icon={<Check className="h-4 w-4" />}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.preventDefault();
                      setRequesting(donation);
                    }}
                    icon={<Send className="h-4 w-4" />}
                  >
                    Request
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={requesting !== null}
        onClose={() => setRequesting(null)}
        title="Link to one of your requests"
        description="DONUM will notify the donor and score the match against that request."
      >
        {myRequests.length === 0 ? (
          <p className="text-sm text-ink/60">
            You have no open requests. Create one first so DONUM knows what you need.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {myRequests.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRequest(request.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-ink/8 p-3.5 text-left transition hover:border-primary/40 hover:bg-primary-50/40 disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{request.title}</p>
                    <p className="mt-0.5 text-xs text-ink/50">
                      Needs {request.quantity} {request.unit} · {CATEGORY_LABEL[request.category]}
                    </p>
                  </div>
                  <Badge tone="primary">{request.urgency}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
