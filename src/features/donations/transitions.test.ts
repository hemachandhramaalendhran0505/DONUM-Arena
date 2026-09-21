/**
 * Lifecycle guard tests (§10, §14, §19).
 *
 * These assert the negative cases — that invalid transitions are *rejected*.
 * A state machine that only ever gets exercised on the happy path is
 * indistinguishable from no state machine at all.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { localStore } from '@/services/localStore';
import { createDonation, updateDonationStatus } from '@/features/donations/donationService';
import { advanceTask } from '@/features/tracking/taskService';
import {
  DONATION_TRANSITIONS,
  InvalidTransitionError,
  TASK_TRANSITIONS,
  canTransitionDonation,
  canTransitionRequest,
  canTransitionTask,
} from '@/features/donations/lifecycle';
import type { DeliveryTask, Donation, DonationStatus, UserProfile } from '@/types';

describe('donation state machine', () => {
  it('permits the documented happy path end to end', () => {
    const path: DonationStatus[] = [
      'created',
      'matching',
      'matched',
      'accepted',
      'pickup_scheduled',
      'picked_up',
      'delivered',
      'completed',
    ];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(
        canTransitionDonation(path[i], path[i + 1]),
        `${path[i]} → ${path[i + 1]} should be allowed`,
      ).toBe(true);
    }
  });

  it('refuses to move a donation backwards', () => {
    expect(canTransitionDonation('delivered', 'matched')).toBe(false);
    expect(canTransitionDonation('completed', 'accepted')).toBe(false);
    expect(canTransitionDonation('picked_up', 'created')).toBe(false);
  });

  it('refuses to skip handover steps', () => {
    // The whole point of the chain of custody: you cannot deliver something
    // that was never collected.
    expect(canTransitionDonation('accepted', 'delivered')).toBe(false);
    expect(canTransitionDonation('matched', 'picked_up')).toBe(false);
    expect(canTransitionDonation('created', 'completed')).toBe(false);
  });

  it('treats terminal states as final', () => {
    for (const terminal of ['completed', 'cancelled', 'expired'] as DonationStatus[]) {
      expect(DONATION_TRANSITIONS[terminal]).toEqual([]);
      expect(canTransitionDonation(terminal, 'matching')).toBe(false);
    }
  });

  it('allows cancellation from any live state but not after completion', () => {
    for (const live of ['created', 'matching', 'matched', 'accepted', 'picked_up'] as DonationStatus[]) {
      expect(canTransitionDonation(live, 'cancelled')).toBe(true);
    }
    expect(canTransitionDonation('completed', 'cancelled')).toBe(false);
  });

  it('treats a repeat write of the same status as a no-op, not an error', () => {
    expect(canTransitionDonation('matched', 'matched')).toBe(true);
  });
});

describe('request state machine', () => {
  it('follows created → searching → matched → fulfilled → completed', () => {
    expect(canTransitionRequest('created', 'searching')).toBe(true);
    expect(canTransitionRequest('searching', 'matched')).toBe(true);
    expect(canTransitionRequest('matched', 'fulfilled')).toBe(true);
    expect(canTransitionRequest('fulfilled', 'completed')).toBe(true);
  });

  it('lets a partially filled request resume searching', () => {
    expect(canTransitionRequest('matched', 'searching')).toBe(true);
    expect(canTransitionRequest('fulfilled', 'searching')).toBe(true);
  });

  it('rejects regressions out of terminal states', () => {
    expect(canTransitionRequest('completed', 'searching')).toBe(false);
    expect(canTransitionRequest('cancelled', 'matched')).toBe(false);
  });
});

describe('delivery task state machine', () => {
  it('is strictly linear through the seven documented states', () => {
    expect(canTransitionTask('available', 'accepted')).toBe(true);
    expect(canTransitionTask('accepted', 'going_to_pickup')).toBe(true);
    expect(canTransitionTask('going_to_pickup', 'picked_up')).toBe(true);
    expect(canTransitionTask('picked_up', 'out_for_delivery')).toBe(true);
    expect(canTransitionTask('out_for_delivery', 'delivered')).toBe(true);
    expect(canTransitionTask('delivered', 'completed')).toBe(true);
  });

  it('forbids skipping ahead to delivered or completed', () => {
    expect(canTransitionTask('accepted', 'delivered')).toBe(false);
    expect(canTransitionTask('available', 'completed')).toBe(false);
    expect(canTransitionTask('picked_up', 'completed')).toBe(false);
  });

  it('lets a volunteer release a task back to the pool before pickup only', () => {
    expect(canTransitionTask('accepted', 'available')).toBe(true);
    expect(canTransitionTask('going_to_pickup', 'available')).toBe(true);
    // Once goods are in hand, abandoning the task is not a state change.
    expect(canTransitionTask('picked_up', 'available')).toBe(false);
    expect(TASK_TRANSITIONS.completed).toEqual([]);
  });
});

// --- enforcement at the write path -----------------------------------------

const donor: UserProfile = {
  id: 'u_guard_donor',
  name: 'Guard Donor',
  email: 'guard@donum.app',
  phone: '+91 90000 00000',
  role: 'donor',
  location: 'Indiranagar, Bengaluru',
  city: 'Bengaluru',
  latitude: 12.9784,
  longitude: 77.6408,
  verificationStatus: 'not_required',
  onboardingComplete: true,
  locationPermission: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('the guard is enforced by the service, not just available to it', () => {
  beforeEach(() => {
    localStore.reset(() => ({ users: [], donations: [], requests: [], matches: [], tasks: [], notifications: [] }) as never);
  });

  it('throws when a caller tries an illegal donation transition', async () => {
    const donation = await createDonation(donor, {
      title: 'Guard test crate',
      category: 'groceries',
      description: 'Sealed staples.',
      quantity: 20,
      unit: 'kg',
      condition: 'new',
      pickupDate: Date.now() + 864e5,
      pickupTime: '10:00',
      location: { address: 'Indiranagar, Bengaluru', latitude: 12.9784, longitude: 77.6408 },
      images: [],
    });

    const fresh = { ...donation, status: 'created' as const };

    // created → delivered skips the entire chain of custody.
    await expect(updateDonationStatus(fresh, 'delivered')).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );

    // and the record must be untouched by the rejected attempt
    const stored = localStore.get<Donation>('donations', donation.id);
    expect(stored?.status).not.toBe('delivered');
  });

  it('throws when a volunteer task skips a step', async () => {
    const volunteer: UserProfile = { ...donor, id: 'u_guard_vol', role: 'volunteer', name: 'Guard Vol' };
    const task = localStore.insert<DeliveryTask>('tasks', {
      id: 'task_guard_1',
      donationId: 'don_guard_1',
      title: 'Guard task',
      status: 'accepted',
      pickup: { address: 'A', latitude: 12.97, longitude: 77.64 },
      dropoff: { address: 'B', latitude: 12.95, longitude: 77.62 },
      distanceKm: 4,
      estimatedMinutes: 20,
      timeline: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as unknown as DeliveryTask);

    await expect(advanceTask(task, 'delivered', volunteer)).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
    expect(localStore.get<DeliveryTask>('tasks', task.id)?.status).toBe('accepted');
  });
});
