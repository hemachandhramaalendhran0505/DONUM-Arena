/**
 * DONUM — browse filtering and sorting (§12).
 *
 * Extracted from the browse page so the six required filter dimensions can be
 * tested directly against data. While this lived inside a `useMemo` the only
 * thing a test could assert was that the dropdowns rendered — which says
 * nothing about whether selecting one actually changes the results.
 */
import type { Donation, DonationCategory, Urgency } from '@/types';
import { URGENCY_RANK, donationUrgency } from '@/utils/urgency';

export type ExpiryFilter = 'any' | 'none' | '12' | '24' | '48' | '168';
export type PickupWindow = 'any' | 'today' | 'tomorrow' | 'week';
export type BrowseSort = 'distance' | 'urgency' | 'expiry' | 'quantity' | 'newest';

/** A donation paired with its distance from the viewer. */
export interface ScopedDonation {
  donation: Donation;
  distanceKm: number;
}

export interface BrowseFilters {
  query: string;
  category: DonationCategory | '';
  /** Kilometres; 0 or NaN means "any distance". */
  maxDistanceKm: number;
  /** Minimum quantity; 0 means "any". */
  minQuantity: number;
  expiry: ExpiryFilter;
  /** Show donations at this urgency *or higher*. Empty means "any". */
  urgency: Urgency | '';
  pickupWindow: PickupWindow;
}

export const EMPTY_FILTERS: BrowseFilters = {
  query: '',
  category: '',
  maxDistanceKm: 0,
  minQuantity: 0,
  expiry: 'any',
  urgency: '',
  pickupWindow: 'any',
};

const WINDOW_DAYS: Record<Exclude<PickupWindow, 'any'>, number> = {
  today: 1,
  tomorrow: 2,
  week: 7,
};

/** How many non-default filters are active — drives the "3 active" badge. */
export function activeFilterCount(f: BrowseFilters): number {
  let n = 0;
  if (f.category) n += 1;
  if (f.maxDistanceKm > 0) n += 1;
  if (f.minQuantity > 0) n += 1;
  if (f.expiry !== 'any') n += 1;
  if (f.urgency) n += 1;
  if (f.pickupWindow !== 'any') n += 1;
  return n;
}

export function matchesFilters(
  { donation, distanceKm }: ScopedDonation,
  f: BrowseFilters,
  now: number,
): boolean {
  const q = f.query.trim().toLowerCase();
  if (
    q &&
    !donation.title.toLowerCase().includes(q) &&
    !donation.description.toLowerCase().includes(q)
  ) {
    return false;
  }

  if (f.category && donation.category !== f.category) return false;
  if (f.maxDistanceKm > 0 && distanceKm > f.maxDistanceKm) return false;
  if (f.minQuantity > 0 && donation.quantity < f.minQuantity) return false;

  // Urgency is a floor, not an exact match: "High and above" must also surface
  // critical items, which carry the lower rank number.
  if (f.urgency) {
    const rank = URGENCY_RANK[donationUrgency(donation, now)];
    if (rank > URGENCY_RANK[f.urgency]) return false;
  }

  if (f.pickupWindow !== 'any') {
    const days = WINDOW_DAYS[f.pickupWindow];
    const startOfToday = new Date(now).setHours(0, 0, 0, 0);
    if (donation.pickupDate >= startOfToday + days * 864e5) return false;
  }

  if (f.expiry === 'none') return !donation.expiryDate;
  if (f.expiry !== 'any') {
    if (!donation.expiryDate) return false;
    const hours = (donation.expiryDate - now) / 36e5;
    if (hours < 0 || hours > Number(f.expiry)) return false;
  }

  return true;
}

export function sortDonations(
  items: ScopedDonation[],
  sort: BrowseSort,
  now: number,
): ScopedDonation[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'urgency': {
        const diff =
          URGENCY_RANK[donationUrgency(a.donation, now)] -
          URGENCY_RANK[donationUrgency(b.donation, now)];
        // Ties broken by proximity: of two equally urgent donations, the
        // closer one is the one a receiver can actually act on first.
        return diff !== 0 ? diff : a.distanceKm - b.distanceKm;
      }
      case 'expiry':
        return (a.donation.expiryDate ?? Infinity) - (b.donation.expiryDate ?? Infinity);
      case 'quantity':
        return b.donation.quantity - a.donation.quantity;
      case 'newest':
        return b.donation.createdAt - a.donation.createdAt;
      default:
        return a.distanceKm - b.distanceKm;
    }
  });
}

/** Apply the six filters and the chosen sort. */
export function applyBrowse(
  items: ScopedDonation[],
  filters: BrowseFilters,
  sort: BrowseSort,
  now: number = Date.now(),
): ScopedDonation[] {
  return sortDonations(
    items.filter((item) => matchesFilters(item, filters, now)),
    sort,
    now,
  );
}
