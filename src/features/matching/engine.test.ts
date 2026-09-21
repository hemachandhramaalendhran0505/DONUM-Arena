import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  categoryScore,
  distanceScore,
  expiryScore,
  findBestMatch,
  normalizeWeights,
  quantityScore,
  rankDonationsForRequest,
  scoreMatch,
  urgencyScore,
} from './engine';
import type { Donation, ResourceRequest } from '@/types';

const HOUR = 36e5;
const NOW = new Date('2026-09-21T09:00:00Z').getTime();

function donation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: 'd1',
    donorId: 'u1',
    donorName: 'Test Donor',
    donorVerification: 'verified',
    title: 'Cooked meals',
    category: 'food_items',
    description: 'Surplus meals',
    quantity: 50,
    unit: 'meals',
    condition: 'cooked',
    expiryDate: NOW + 10 * HOUR,
    pickupDate: NOW + 2 * HOUR,
    pickupTime: '18:00',
    location: { latitude: 12.9716, longitude: 77.5946, address: 'MG Road' },
    images: [],
    status: 'created',
    timeline: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function request(overrides: Partial<ResourceRequest> = {}): ResourceRequest {
  return {
    id: 'r1',
    requestorId: 'u2',
    requestorName: 'Test NGO',
    requestorRole: 'ngo',
    requestorVerification: 'verified',
    title: 'Meals needed',
    category: 'food_items',
    quantity: 50,
    unit: 'meals',
    urgency: 'critical',
    requiredBy: NOW + 6 * HOUR,
    location: { latitude: 12.9756, longitude: 77.6, address: 'Shivajinagar' },
    description: 'Evening meals',
    beneficiaryCount: 50,
    status: 'searching',
    timeline: [],
    fulfilledQuantity: 0,
    matchedDonationIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('component scores', () => {
  it('scores distance in the documented bands', () => {
    expect(distanceScore(1.2)).toBe(1);
    expect(distanceScore(2)).toBe(0.8);
    expect(distanceScore(4.9)).toBe(0.8);
    expect(distanceScore(7)).toBe(0.6);
    expect(distanceScore(15)).toBe(0.4);
    expect(distanceScore(40)).toBe(0.2);
  });

  it('scores urgency levels', () => {
    expect(urgencyScore('critical')).toBe(1);
    expect(urgencyScore('high')).toBe(0.8);
    expect(urgencyScore('medium')).toBe(0.5);
    expect(urgencyScore('low')).toBe(0.2);
  });

  it('scores exact, related and unrelated categories', () => {
    expect(categoryScore('food_items', 'food_items')).toBe(1);
    expect(categoryScore('food_items', 'groceries')).toBe(0.5);
    expect(categoryScore('clothes', 'animal_food')).toBe(0);
  });

  it('rewards quantities that cover the need', () => {
    expect(quantityScore(50, 50)).toBe(1);
    expect(quantityScore(60, 50)).toBe(1);
    expect(quantityScore(25, 50)).toBeCloseTo(0.5, 5);
    expect(quantityScore(500, 50)).toBeLessThan(1);
    expect(quantityScore(0, 50)).toBe(0);
  });

  it('prioritises soon-to-expire donations and rejects expired ones', () => {
    expect(expiryScore(NOW + 6 * HOUR, NOW)).toBe(1);
    expect(expiryScore(NOW + 30 * HOUR, NOW)).toBe(0.75);
    expect(expiryScore(NOW - HOUR, NOW)).toBe(0);
    expect(expiryScore(undefined, NOW)).toBe(0.5);
  });
});

describe('scoreMatch', () => {
  it('computes the weighted sum from the component scores', () => {
    const result = scoreMatch(donation(), request(), { now: NOW });
    const expected =
      DEFAULT_WEIGHTS.distance * result.distanceScore +
      DEFAULT_WEIGHTS.urgency * result.urgencyScore +
      DEFAULT_WEIGHTS.category * result.categoryScore +
      DEFAULT_WEIGHTS.quantity * result.quantityScore +
      DEFAULT_WEIGHTS.expiry * result.expiryScore;
    expect(result.matchScore).toBeCloseTo(expected, 2);
    expect(result.matchScore).toBeGreaterThan(0.9);
  });

  it('returns zero when categories are incompatible', () => {
    const result = scoreMatch(donation({ category: 'clothes' }), request({ category: 'animal_food' }), {
      now: NOW,
    });
    expect(result.categoryScore).toBe(0);
    expect(result.matchScore).toBe(0);
  });

  it('produces a human readable explanation', () => {
    const result = scoreMatch(donation(), request(), { now: NOW });
    expect(result.explanation.startsWith('Matched because')).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(1);
  });

  it('honours configurable weights', () => {
    const far = request({ location: { latitude: 13.3, longitude: 77.9, address: 'Far away' } });
    const distanceHeavy = scoreMatch(donation(), far, {
      now: NOW,
      weights: { distance: 1, urgency: 0, category: 0, quantity: 0, expiry: 0 },
    });
    const urgencyHeavy = scoreMatch(donation(), far, {
      now: NOW,
      weights: { distance: 0, urgency: 1, category: 0, quantity: 0, expiry: 0 },
    });
    expect(distanceHeavy.matchScore).toBeLessThan(urgencyHeavy.matchScore);
  });

  it('normalises weights that do not sum to one', () => {
    const w = normalizeWeights({ distance: 3, urgency: 3, category: 2, quantity: 1, expiry: 1 });
    const total = w.distance + w.urgency + w.category + w.quantity + w.expiry;
    expect(total).toBeCloseTo(1, 10);
  });

  it('penalises donations that expire before they are needed', () => {
    const ok = scoreMatch(donation(), request({ requiredBy: NOW + 4 * HOUR }), { now: NOW });
    const tooLate = scoreMatch(
      donation({ expiryDate: NOW + HOUR, pickupDate: NOW + 5 * HOUR }),
      request({ requiredBy: NOW + 4 * HOUR }),
      { now: NOW },
    );
    expect(tooLate.matchScore).toBeLessThan(ok.matchScore);
  });
});

describe('ranking', () => {
  it('ranks the nearest, most urgent request first', () => {
    const near = request({ id: 'near', urgency: 'critical' });
    const far = request({
      id: 'far',
      urgency: 'low',
      location: { latitude: 13.2, longitude: 77.9, address: 'Far' },
    });
    const best = findBestMatch(donation(), [far, near], { now: NOW });
    expect(best?.request.id).toBe('near');
  });

  it('filters out donations below the threshold', () => {
    const mismatch = donation({ id: 'x', category: 'animal_food' });
    const results = rankDonationsForRequest(request({ category: 'clothes' }), [mismatch], {
      now: NOW,
    });
    expect(results).toHaveLength(0);
  });

  it('only considers open donations', () => {
    const completed = donation({ id: 'done', status: 'completed' });
    const open = donation({ id: 'open', status: 'created' });
    const results = rankDonationsForRequest(request(), [completed, open], { now: NOW });
    expect(results.map((r) => r.donation.id)).toEqual(['open']);
  });
});
