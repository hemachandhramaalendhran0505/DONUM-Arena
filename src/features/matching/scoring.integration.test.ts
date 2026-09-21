/**
 * Matching engine — the exact scenario from the verification brief (§13, §14).
 *
 * Runs the real engine (no mocks) over a 50-meal donation and a 40-meal HIGH
 * urgency request nearby, then asserts every score is a finite number, the
 * result is deterministic, and that hostile coordinates cannot produce NaN.
 */
import { describe, expect, it } from 'vitest';

import { scoreMatch } from '@/features/matching/engine';
import type { Donation, ResourceRequest } from '@/types';

const NOW = new Date('2026-04-02T08:00:00Z').getTime();
const HOUR = 36e5;

const donation50Meals: Donation = {
  id: 'don_meals',
  donorId: 'u_donor',
  donorName: 'Grand Vista Hotel',
  donorVerification: 'verified',
  title: 'Surplus buffet — 50 meals',
  category: 'food_items',
  description: 'Vegetarian buffet surplus, packed hot.',
  quantity: 50,
  unit: 'meals',
  condition: 'cooked',
  expiryDate: NOW + 8 * HOUR,
  pickupDate: NOW + 2 * HOUR,
  pickupTime: '13:00',
  location: { address: 'Indiranagar, Bengaluru', latitude: 12.9784, longitude: 77.6408 },
  images: [],
  status: 'created',
  timeline: [],
  createdAt: NOW,
  updatedAt: NOW,
} as Donation;

const request40Meals: ResourceRequest = {
  id: 'req_meals',
  requestorId: 'u_ngo',
  requestorName: 'Anna Seva Foundation',
  requestorRole: 'ngo',
  requestorVerification: 'verified',
  matchedDonationIds: [],
  title: 'Evening meals for shelter',
  category: 'food_items',
  description: 'Hot meals needed for tonight.',
  quantity: 40,
  unit: 'meals',
  urgency: 'high',
  requiredBy: NOW + 6 * HOUR,
  location: { address: 'Shivajinagar, Bengaluru', latitude: 12.9853, longitude: 77.6058 },
  beneficiaryCount: 40,
  status: 'searching',
  fulfilledQuantity: 0,
  timeline: [],
  createdAt: NOW,
  updatedAt: NOW,
};

describe('50 meals offered against a 40 meal high-urgency request', () => {
  const result = scoreMatch(donation50Meals, request40Meals, { now: NOW });

  it('produces a finite score for every dimension', () => {
    for (const key of [
      'matchScore',
      'distanceScore',
      'urgencyScore',
      'categoryScore',
      'quantityScore',
      'expiryScore',
      'distanceKm',
    ] as const) {
      const value = result[key] as number;
      expect(Number.isFinite(value), `${key} must be finite, got ${value}`).toBe(true);
      expect(Number.isNaN(value), `${key} must not be NaN`).toBe(false);
    }
  });

  it('keeps every sub-score inside 0..1', () => {
    for (const key of [
      'matchScore',
      'distanceScore',
      'urgencyScore',
      'categoryScore',
      'quantityScore',
      'expiryScore',
    ] as const) {
      const value = result[key] as number;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('scores the category as an exact match', () => {
    expect(result.categoryScore).toBe(1);
  });

  it('scores high urgency per the documented table', () => {
    expect(result.urgencyScore).toBe(0.8);
  });

  it('treats 50 offered against 40 needed as a good quantity fit', () => {
    // ratio 1.25 sits in the 1.0–1.5 band, which is a full score.
    expect(result.quantityScore).toBe(1);
  });

  it('computes a real distance, not a placeholder', () => {
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.distanceKm).toBeLessThan(15);
  });

  it('is deterministic across repeated runs', () => {
    const again = scoreMatch(donation50Meals, request40Meals, { now: NOW });
    expect(again).toEqual(result);
    const third = scoreMatch(donation50Meals, request40Meals, { now: NOW });
    expect(third.matchScore).toBe(result.matchScore);
  });

  it('rates this pairing as a strong match overall', () => {
    expect(result.matchScore).toBeGreaterThan(0.6);
  });

  it('explains itself in plain language', () => {
    expect(result.explanation).toBeTruthy();
    expect(result.explanation.toLowerCase()).not.toContain('nan');
  });
});

// --- §14 hostile coordinates ----------------------------------------------

const HOSTILE: Array<[string, number, number]> = [
  ['NaN', NaN, NaN],
  ['Infinity', Infinity, Infinity],
  ['-Infinity', -Infinity, -Infinity],
  ['latitude > 90', 91, 77.6],
  ['latitude < -90', -91, 77.6],
  ['longitude > 180', 12.9, 181],
  ['longitude < -180', 12.9, -181],
  ['0,0 placeholder', 0, 0],
];

describe('invalid coordinates never poison a match', () => {
  for (const [label, latitude, longitude] of HOSTILE) {
    it(`survives ${label}`, () => {
      const broken: Donation = {
        ...donation50Meals,
        location: { address: 'Unknown', latitude, longitude },
      };
      const scored = scoreMatch(broken, request40Meals, { now: NOW });

      expect(Number.isNaN(scored.matchScore), 'matchScore must not be NaN').toBe(false);
      expect(Number.isFinite(scored.matchScore)).toBe(true);
      expect(Number.isNaN(scored.distanceScore)).toBe(false);
      expect(Number.isNaN(scored.distanceKm)).toBe(false);
      // -1 is the documented "distance unknown" sentinel, never Infinity.
      expect(scored.distanceKm === -1 || scored.distanceKm >= 0).toBe(true);
      expect(Number.isFinite(scored.distanceKm)).toBe(true);
      expect(scored.explanation.toLowerCase()).not.toContain('nan');
      expect(scored.explanation.toLowerCase()).not.toContain('infinity');
    });
  }

  it('still ranks a valid donation above one with unusable coordinates', () => {
    const good = scoreMatch(donation50Meals, request40Meals, { now: NOW });
    const bad = scoreMatch(
      { ...donation50Meals, location: { address: '?', latitude: NaN, longitude: NaN } },
      request40Meals,
      { now: NOW },
    );
    expect(good.matchScore).toBeGreaterThan(bad.matchScore);
  });
});
