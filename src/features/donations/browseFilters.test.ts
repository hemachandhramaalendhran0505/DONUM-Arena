/**
 * Browse filter behaviour (§12).
 *
 * The spec is explicit that rendering the six controls is not enough — each
 * one must actually change what is displayed. These tests assert on the
 * resulting set of donations, so a filter that is wired to nothing fails here.
 */
import { describe, expect, it } from 'vitest';

import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyBrowse,
  type BrowseFilters,
  type ScopedDonation,
} from '@/features/donations/browseFilters';
import type { Donation } from '@/types';
import { URGENCY_RANK, donationUrgency } from '@/utils/urgency';

const NOW = new Date('2026-03-10T09:00:00Z').getTime();
const HOUR = 36e5;
const DAY = 864e5;

function donation(over: Partial<Donation> & { id: string }): Donation {
  return {
    donorId: 'u_donor',
    donorName: 'Donor',
    donorVerification: 'not_required',
    title: 'Item',
    category: 'groceries',
    description: 'Some goods',
    quantity: 10,
    unit: 'kg',
    condition: 'new',
    pickupDate: NOW + 3 * DAY,
    pickupTime: '10:00',
    location: { address: 'Indiranagar, Bengaluru', latitude: 12.97, longitude: 77.64 },
    images: [],
    status: 'created',
    timeline: [],
    createdAt: NOW - DAY,
    updatedAt: NOW - DAY,
    ...over,
  } as Donation;
}

/** Fixture spanning every dimension the six filters slice on. */
const ITEMS: ScopedDonation[] = [
  {
    // perishable, expires in 6h => critical
    donation: donation({
      id: 'd_urgent_food',
      title: 'Hot biryani trays',
      category: 'food_items',
      quantity: 50,
      expiryDate: NOW + 6 * HOUR,
      pickupDate: NOW + 4 * HOUR,
      createdAt: NOW - HOUR,
    }),
    distanceKm: 1.2,
  },
  {
    // expires in 40h => medium-ish, far away
    donation: donation({
      id: 'd_far_groceries',
      title: 'Rice sacks',
      category: 'groceries',
      quantity: 100,
      expiryDate: NOW + 40 * HOUR,
      pickupDate: NOW + 2 * DAY,
    }),
    distanceKm: 18,
  },
  {
    // no expiry, distant pickup => low urgency
    donation: donation({
      id: 'd_clothes',
      title: 'Winter jackets',
      category: 'clothes',
      quantity: 5,
      pickupDate: NOW + 6 * DAY,
    }),
    distanceKm: 3.5,
  },
  {
    donation: donation({
      id: 'd_animal',
      title: 'Dog food bags',
      category: 'animal_food',
      quantity: 30,
      pickupDate: NOW + 10 * DAY,
      createdAt: NOW - 5 * DAY,
    }),
    distanceKm: 7,
  },
];

const ids = (items: ScopedDonation[]) => items.map((i) => i.donation.id);

describe('browse filters change the result set', () => {
  it('returns everything when no filter is applied', () => {
    expect(applyBrowse(ITEMS, EMPTY_FILTERS, 'distance', NOW)).toHaveLength(4);
  });

  it('1. category narrows to that category only', () => {
    const out = applyBrowse(ITEMS, { ...EMPTY_FILTERS, category: 'clothes' }, 'distance', NOW);
    expect(ids(out)).toEqual(['d_clothes']);
  });

  it('2. distance excludes donations beyond the radius', () => {
    const out = applyBrowse(ITEMS, { ...EMPTY_FILTERS, maxDistanceKm: 5 }, 'distance', NOW);
    expect(ids(out)).toEqual(['d_urgent_food', 'd_clothes']);
    expect(ids(out)).not.toContain('d_far_groceries'); // 18 km away
  });

  it('3. minimum quantity drops smaller donations', () => {
    const out = applyBrowse(ITEMS, { ...EMPTY_FILTERS, minQuantity: 40 }, 'distance', NOW);
    expect(ids(out).sort()).toEqual(['d_far_groceries', 'd_urgent_food']);
  });

  it('4. urgency acts as a floor, not an exact match', () => {
    // "High and above" must still include critical items.
    const high = applyBrowse(ITEMS, { ...EMPTY_FILTERS, urgency: 'high' }, 'distance', NOW);
    expect(ids(high)).toContain('d_urgent_food');
    expect(ids(high)).not.toContain('d_clothes');

    const critical = applyBrowse(ITEMS, { ...EMPTY_FILTERS, urgency: 'critical' }, 'distance', NOW);
    expect(ids(critical)).toEqual(['d_urgent_food']);
  });

  it('5. expiry window keeps only items expiring inside it', () => {
    const within12 = applyBrowse(ITEMS, { ...EMPTY_FILTERS, expiry: '12' }, 'distance', NOW);
    expect(ids(within12)).toEqual(['d_urgent_food']);

    const within48 = applyBrowse(ITEMS, { ...EMPTY_FILTERS, expiry: '48' }, 'distance', NOW);
    expect(ids(within48).sort()).toEqual(['d_far_groceries', 'd_urgent_food']);

    // "No expiry date" is the inverse set, not a no-op.
    const none = applyBrowse(ITEMS, { ...EMPTY_FILTERS, expiry: 'none' }, 'distance', NOW);
    expect(ids(none).sort()).toEqual(['d_animal', 'd_clothes']);
  });

  it('6. pickup date window filters by collection day', () => {
    const today = applyBrowse(ITEMS, { ...EMPTY_FILTERS, pickupWindow: 'today' }, 'distance', NOW);
    expect(ids(today)).toEqual(['d_urgent_food']);

    const week = applyBrowse(ITEMS, { ...EMPTY_FILTERS, pickupWindow: 'week' }, 'distance', NOW);
    expect(ids(week)).not.toContain('d_animal'); // 10 days out
    expect(ids(week)).toContain('d_clothes'); // 6 days out
  });

  it('text search matches title and description', () => {
    expect(ids(applyBrowse(ITEMS, { ...EMPTY_FILTERS, query: 'biryani' }, 'distance', NOW))).toEqual(
      ['d_urgent_food'],
    );
  });

  it('combines filters conjunctively', () => {
    const out = applyBrowse(
      ITEMS,
      { ...EMPTY_FILTERS, category: 'groceries', maxDistanceKm: 5 },
      'distance',
      NOW,
    );
    // Rice is groceries but 18 km away, so the combination yields nothing.
    expect(out).toEqual([]);
  });
});

describe('clearing a filter restores the dataset (§15)', () => {
  it('round-trips: full set -> filtered -> full set again', () => {
    const full = applyBrowse(ITEMS, EMPTY_FILTERS, 'distance', NOW);
    expect(full).toHaveLength(4);

    const narrowed = applyBrowse(ITEMS, { ...EMPTY_FILTERS, category: 'clothes' }, 'distance', NOW);
    expect(narrowed).toHaveLength(1);

    // Resetting to the empty filter set must return exactly the original rows,
    // in the same order — no state left behind by the previous filter.
    const restored = applyBrowse(ITEMS, EMPTY_FILTERS, 'distance', NOW);
    expect(ids(restored)).toEqual(ids(full));
  });

  it('restores the dataset after every single filter is cleared in turn', () => {
    const baseline = ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'distance', NOW));
    const each: BrowseFilters[] = [
      { ...EMPTY_FILTERS, category: 'groceries' },
      { ...EMPTY_FILTERS, maxDistanceKm: 2 },
      { ...EMPTY_FILTERS, minQuantity: 45 },
      { ...EMPTY_FILTERS, urgency: 'critical' },
      { ...EMPTY_FILTERS, expiry: '12' },
      { ...EMPTY_FILTERS, pickupWindow: 'today' },
    ];
    for (const filters of each) {
      const narrowed = applyBrowse(ITEMS, filters, 'distance', NOW);
      expect(narrowed.length).toBeLessThan(baseline.length);
      expect(ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'distance', NOW))).toEqual(baseline);
    }
  });
});

describe('browse sorting', () => {
  it('orders most urgent first, breaking ties by distance', () => {
    const out = applyBrowse(ITEMS, EMPTY_FILTERS, 'urgency', NOW);
    expect(out[0].donation.id).toBe('d_urgent_food');
  });

  it('"most urgent first" genuinely changes the ordering', () => {
    // Asserting the first element alone would pass even if the sort were a
    // no-op, because the most urgent item is also the nearest in this fixture.
    const byQuantity = ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'quantity', NOW));
    const byUrgency = ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'urgency', NOW));
    expect(byUrgency).not.toEqual(byQuantity);

    // And the ordering must be non-increasing in urgency rank.
    const ranks = applyBrowse(ITEMS, EMPTY_FILTERS, 'urgency', NOW).map(
      (i) => URGENCY_RANK[donationUrgency(i.donation, NOW)],
    );
    expect([...ranks]).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('orders by distance, expiry, quantity and recency', () => {
    expect(ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'distance', NOW))[0]).toBe('d_urgent_food');
    expect(ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'expiry', NOW))[0]).toBe('d_urgent_food');
    expect(ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'quantity', NOW))[0]).toBe('d_far_groceries');
    expect(ids(applyBrowse(ITEMS, EMPTY_FILTERS, 'newest', NOW))[0]).toBe('d_urgent_food');
  });

  it('does not mutate the input array', () => {
    const before = ids(ITEMS);
    applyBrowse(ITEMS, EMPTY_FILTERS, 'quantity', NOW);
    expect(ids(ITEMS)).toEqual(before);
  });
});

describe('active filter count', () => {
  it('counts only non-default filters', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, category: 'clothes' })).toBe(1);
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, category: 'clothes', urgency: 'high', expiry: '24' }),
    ).toBe(3);
    // A free-text query is not one of the six filter dimensions.
    expect(activeFilterCount({ ...EMPTY_FILTERS, query: 'rice' })).toBe(0);
  });
});
