import { describe, expect, it } from 'vitest';
import { donationUrgency } from './urgency';
import type { Donation } from '@/types';

const HOUR = 36e5;
const DAY = 24 * HOUR;
const NOW = new Date('2026-09-21T09:00:00Z').getTime();

function donation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: 'd',
    donorId: 'u',
    donorName: 'Donor',
    donorVerification: 'verified',
    title: 'Test',
    category: 'food_items',
    description: '',
    quantity: 10,
    unit: 'meals',
    condition: 'good',
    pickupDate: NOW + 10 * DAY,
    pickupTime: '10:00',
    location: { latitude: 12.97, longitude: 77.59, address: 'X' },
    images: [],
    status: 'created',
    timeline: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('donationUrgency', () => {
  it('marks food expiring within 12 hours as critical', () => {
    expect(donationUrgency(donation({ expiryDate: NOW + 5 * HOUR }), NOW)).toBe('critical');
  });

  it('marks food expiring within a day as high', () => {
    expect(donationUrgency(donation({ expiryDate: NOW + 20 * HOUR }), NOW)).toBe('high');
  });

  it('escalates when the pickup window is imminent', () => {
    expect(donationUrgency(donation({ pickupDate: NOW + 3 * HOUR }), NOW)).toBe('high');
  });

  it('treats a few days of shelf life as medium', () => {
    expect(donationUrgency(donation({ expiryDate: NOW + 2 * DAY }), NOW)).toBe('medium');
  });

  it('leaves non-perishables with distant pickup as low', () => {
    const d = donation({ category: 'clothes', expiryDate: undefined, pickupDate: NOW + 9 * DAY });
    expect(donationUrgency(d, NOW)).toBe('low');
  });

  it('treats already-expired donations as critical so they surface for triage', () => {
    expect(donationUrgency(donation({ expiryDate: NOW - HOUR }), NOW)).toBe('critical');
  });
});
