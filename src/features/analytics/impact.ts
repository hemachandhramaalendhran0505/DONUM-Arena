/**
 * DONUM — impact analytics.
 *
 * Derives every headline metric and chart series from live donation, task and
 * request data. Estimation constants are documented so numbers are defensible.
 */
import type {
  CategoryBucket,
  DeliveryTask,
  Donation,
  DonationCategory,
  ImpactSummary,
  LocationBucket,
  ResourceRequest,
  TimeBucket,
} from '@/types';
import { CATEGORY_LABEL } from '@/utils/labels';

/** Average kilograms of material diverted from waste per unit, by category. */
const KG_PER_UNIT: Record<DonationCategory, number> = {
  food_items: 0.45, // one meal ≈ 450 g
  groceries: 4.5, // one kit ≈ 4.5 kg
  clothes: 0.4,
  essentials: 0.6,
  animal_food: 1,
  other: 0.5,
};

/** People reached per unit donated. */
const PEOPLE_PER_UNIT: Record<DonationCategory, number> = {
  food_items: 1,
  groceries: 4.2,
  clothes: 1,
  essentials: 3.5,
  animal_food: 1.5,
  other: 1,
};

const COMPLETED = new Set(['completed', 'delivered']);

export function peopleReachedFor(donation: Donation): number {
  if (donation.peopleHelped) return donation.peopleHelped;
  return Math.round(donation.quantity * (PEOPLE_PER_UNIT[donation.category] ?? 1));
}

export function wasteDivertedFor(donation: Donation): number {
  return donation.quantity * (KG_PER_UNIT[donation.category] ?? 0.5);
}

export function buildImpactSummary(
  donations: Donation[],
  tasks: DeliveryTask[] = [],
): ImpactSummary {
  const completed = donations.filter((d) => COMPLETED.has(d.status));
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const activeStatuses = new Set(['created', 'matching', 'matched', 'accepted', 'pickup_scheduled', 'picked_up']);
  const activeDonations = donations.filter((d) => activeStatuses.has(d.status)).length;
  const pendingPickups = donations.filter(
    (d) => d.status === 'pickup_scheduled' || d.status === 'accepted',
  ).length;

  const peopleReached = completed.reduce((sum, d) => sum + peopleReachedFor(d), 0);
  const resourcesDistributed = completed.reduce((sum, d) => sum + d.quantity, 0);
  const wasteDivertedKg = completed.reduce((sum, d) => sum + wasteDivertedFor(d), 0);
  const distanceSavedKm = completedTasks.reduce((sum, t) => sum + t.distanceKm, 0);
  const volunteerHours = completedTasks.reduce((sum, t) => sum + t.estimatedMinutes / 60, 0);

  return {
    totalDonations: donations.length,
    successfulDonations: completed.length,
    peopleReached,
    resourcesDistributed,
    volunteerHours: Math.round(volunteerHours * 10) / 10,
    distanceSavedKm: Math.round(distanceSavedKm * 10) / 10,
    wasteDivertedKg: Math.round(wasteDivertedKg),
    activeDonations,
    pendingPickups,
    completionRate: donations.length ? completed.length / donations.length : 0,
  };
}

export function donationsByCategory(donations: Donation[]): CategoryBucket[] {
  const map = new Map<DonationCategory, CategoryBucket>();
  donations.forEach((d) => {
    const bucket = map.get(d.category) ?? { category: d.category, count: 0, quantity: 0 };
    bucket.count += 1;
    bucket.quantity += d.quantity;
    map.set(d.category, bucket);
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Donations grouped into the last `weeks` weekly buckets. */
export function donationsOverTime(donations: Donation[], weeks = 8, now = Date.now()): TimeBucket[] {
  const WEEK = 7 * 24 * 36e5;
  const buckets: TimeBucket[] = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = now - i * WEEK;
    const start = end - WEEK;
    const inRange = donations.filter((d) => d.createdAt > start && d.createdAt <= end);
    buckets.push({
      label: new Date(end).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      date: end,
      donations: inRange.length,
      completed: inRange.filter((d) => COMPLETED.has(d.status)).length,
    });
  }
  return buckets;
}

export function impactByLocation(donations: Donation[], limit = 5): LocationBucket[] {
  const map = new Map<string, LocationBucket>();
  donations
    .filter((d) => COMPLETED.has(d.status))
    .forEach((d) => {
      const city = d.location.address.split(',').pop()?.trim() || d.location.city || 'Unknown';
      const bucket = map.get(city) ?? { city, count: 0, peopleReached: 0 };
      bucket.count += 1;
      bucket.peopleReached += peopleReachedFor(d);
      map.set(city, bucket);
    });
  return [...map.values()].sort((a, b) => b.peopleReached - a.peopleReached).slice(0, limit);
}

export interface RequestStats {
  open: number;
  matched: number;
  fulfilled: number;
  beneficiaries: number;
  criticalOpen: number;
}

export function buildRequestStats(requests: ResourceRequest[]): RequestStats {
  return {
    open: requests.filter((r) => r.status === 'created' || r.status === 'searching').length,
    matched: requests.filter((r) => r.status === 'matched').length,
    fulfilled: requests.filter((r) => r.status === 'fulfilled' || r.status === 'completed').length,
    beneficiaries: requests.reduce((sum, r) => sum + r.beneficiaryCount, 0),
    criticalOpen: requests.filter(
      (r) => r.urgency === 'critical' && (r.status === 'created' || r.status === 'searching'),
    ).length,
  };
}

export const categoryLabel = (c: DonationCategory) => CATEGORY_LABEL[c];
