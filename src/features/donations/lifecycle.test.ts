/**
 * End-to-end lifecycle test against the real service layer.
 *
 * Exercises: donation created → auto-matched → accepted → delivery task →
 * volunteer transitions → completed, verifying that donation, request, task and
 * notification state all stay consistent for every participant.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { AppNotification, DeliveryTask, Donation, Match, ResourceRequest, UserProfile } from '@/types';
import { localStore } from '@/services/localStore';
import { listDocs, getDocById, ensureSeeded } from '@/services/db';
import { createDonation, acceptDonation } from '@/features/donations/donationService';
import { createRequest } from '@/features/requests/requestService';
import { advanceTask } from '@/features/tracking/taskService';
import { TASK_LIFECYCLE } from '@/utils/labels';

const HOUR = 36e5;

const donor: UserProfile = {
  id: 'u_donor',
  name: 'Test Donor',
  email: 'donor@test.dev',
  phone: '+91 90000 00001',
  role: 'donor',
  location: 'Indiranagar, Bengaluru',
  latitude: 12.9784,
  longitude: 77.6408,
  verificationStatus: 'verified',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const ngo: UserProfile = {
  id: 'u_ngo',
  name: 'Test NGO Lead',
  organizationName: 'Test Relief Trust',
  email: 'ngo@test.dev',
  phone: '+91 90000 00002',
  role: 'ngo',
  location: 'Shivajinagar, Bengaluru',
  latitude: 12.9856,
  longitude: 77.6047,
  verificationStatus: 'verified',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const volunteer: UserProfile = {
  id: 'u_vol',
  name: 'Test Volunteer',
  email: 'vol@test.dev',
  phone: '+91 90000 00003',
  role: 'volunteer',
  location: 'Domlur, Bengaluru',
  latitude: 12.9606,
  longitude: 77.638,
  verificationStatus: 'verified',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/** Start every test from a clean, empty database (no seed noise). */
function resetEmpty() {
  localStore.reset(() => ({
    users: [donor, ngo, volunteer],
    credentials: [],
    donations: [],
    requests: [],
    matches: [],
    tasks: [],
    notifications: [],
  }) as never);
}

const flush = () => new Promise((r) => setTimeout(r, 0));

async function notificationsFor(userId: string) {
  const all = await listDocs<AppNotification>('notifications');
  return all.filter((n) => n.userId === userId);
}

beforeEach(() => {
  ensureSeeded();
  resetEmpty();
});

describe('donation → match → delivery → completion', () => {
  it('auto-matches a new donation to the best open request and notifies both parties', async () => {
    await createRequest(ngo, {
      title: 'Hot meals for 100 residents',
      category: 'food_items',
      quantity: 100,
      unit: 'meals',
      urgency: 'critical',
      requiredBy: Date.now() + 6 * HOUR,
      location: { latitude: ngo.latitude, longitude: ngo.longitude, address: 'Shivajinagar' },
      description: 'Urgent dinner service.',
      beneficiaryCount: 100,
    });
    await flush();

    const donation = await createDonation(donor, {
      title: 'Surplus catering',
      category: 'food_items',
      description: 'Vegetarian buffet surplus.',
      quantity: 110,
      unit: 'meals',
      condition: 'cooked',
      expiryDate: Date.now() + 8 * HOUR,
      pickupDate: Date.now() + HOUR,
      pickupTime: '19:00 – 20:00',
      location: { latitude: donor.latitude, longitude: donor.longitude, address: 'Indiranagar' },
      images: [],
      needsVolunteer: true,
    });
    await flush();
    await flush();

    const stored = await getDocById<Donation>('donations', donation.id);
    expect(stored?.status).toBe('matched');
    expect(stored?.matchedReceiverId).toBe(ngo.id);
    expect(stored?.matchScore).toBeGreaterThan(0.8);

    const matches = await listDocs<Match>('matches');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].explanation).toContain('Matched because');

    // Both sides are told.
    expect((await notificationsFor(donor.id)).some((n) => /matched/i.test(n.title))).toBe(true);
    expect((await notificationsFor(ngo.id)).some((n) => /matches your request/i.test(n.title))).toBe(true);

    // The request advanced to matched.
    const requests = await listDocs<ResourceRequest>('requests');
    expect(requests[0].status).toBe('matched');
  });

  it('creates a delivery task on accept and completes the whole chain', async () => {
    await createRequest(ngo, {
      title: 'Meals needed',
      category: 'food_items',
      quantity: 100,
      unit: 'meals',
      urgency: 'high',
      requiredBy: Date.now() + 12 * HOUR,
      location: { latitude: ngo.latitude, longitude: ngo.longitude, address: 'Shivajinagar' },
      description: 'Dinner service.',
      beneficiaryCount: 100,
    });
    await flush();

    const donation = await createDonation(donor, {
      title: 'Surplus meals',
      category: 'food_items',
      description: 'Cooked meals.',
      quantity: 100,
      unit: 'meals',
      condition: 'cooked',
      expiryDate: Date.now() + 10 * HOUR,
      pickupDate: Date.now() + HOUR,
      pickupTime: '19:00 – 20:00',
      location: { latitude: donor.latitude, longitude: donor.longitude, address: 'Indiranagar' },
      images: [],
      needsVolunteer: true,
    });
    await flush();
    await flush();

    const matched = (await getDocById<Donation>('donations', donation.id))!;
    const task = await acceptDonation(matched, ngo);
    await flush();

    expect(task).not.toBeNull();
    expect(task!.status).toBe('available');
    expect(task!.distanceKm).toBeGreaterThan(0);
    expect(task!.estimatedMinutes).toBeGreaterThan(0);
    expect((await getDocById<Donation>('donations', donation.id))?.status).toBe('accepted');

    // Volunteer walks the full task lifecycle.
    for (const status of TASK_LIFECYCLE.slice(1)) {
      const current = (await getDocById<DeliveryTask>('tasks', task!.id))!;
      await advanceTask(current, status, volunteer);
      await flush();
    }

    const finalTask = await getDocById<DeliveryTask>('tasks', task!.id);
    expect(finalTask?.status).toBe('completed');
    expect(finalTask?.volunteerId).toBe(volunteer.id);

    // Donation closed out and credited.
    const finalDonation = await getDocById<Donation>('donations', donation.id);
    expect(finalDonation?.status).toBe('completed');
    expect(finalDonation?.peopleHelped).toBeGreaterThan(0);

    // Request fulfilled.
    const finalRequest = (await listDocs<ResourceRequest>('requests'))[0];
    expect(finalRequest.fulfilledQuantity).toBe(100);
    expect(finalRequest.status).toBe('completed');

    // Everyone was kept informed.
    expect((await notificationsFor(donor.id)).length).toBeGreaterThan(2);
    expect((await notificationsFor(ngo.id)).length).toBeGreaterThan(1);
  });

  it('keeps a donation unmatched when no request is compatible', async () => {
    await createRequest(ngo, {
      title: 'Dog food needed',
      category: 'animal_food',
      quantity: 40,
      unit: 'kg',
      urgency: 'high',
      requiredBy: Date.now() + 2 * 864e5,
      location: { latitude: ngo.latitude, longitude: ngo.longitude, address: 'Shivajinagar' },
      description: 'Shelter feed.',
      beneficiaryCount: 60,
    });
    await flush();

    const donation = await createDonation(donor, {
      title: 'Winter jackets',
      category: 'clothes',
      description: 'Warm clothing.',
      quantity: 50,
      unit: 'items',
      condition: 'good',
      pickupDate: Date.now() + 864e5,
      pickupTime: '10:00 – 12:00',
      location: { latitude: donor.latitude, longitude: donor.longitude, address: 'Indiranagar' },
      images: [],
    });
    await flush();
    await flush();

    const stored = await getDocById<Donation>('donations', donation.id);
    // Clothes vs animal food scores 0 → no match, stays searching.
    expect(stored?.status).toBe('matching');
    expect(stored?.matchedReceiverId).toBeUndefined();
  });

  it('records a full audit trail on the donation timeline', async () => {
    const donation = await createDonation(donor, {
      title: 'Grocery kits',
      category: 'groceries',
      description: 'Ration kits.',
      quantity: 20,
      unit: 'kits',
      condition: 'new',
      pickupDate: Date.now() + 864e5,
      pickupTime: '10:00 – 12:00',
      location: { latitude: donor.latitude, longitude: donor.longitude, address: 'Indiranagar' },
      images: [],
    });
    await flush();
    await flush();

    const stored = await getDocById<Donation>('donations', donation.id);
    expect(stored?.timeline.length).toBeGreaterThan(0);
    expect(stored?.timeline[0].status).toBe('created');
    stored?.timeline.forEach((event) => {
      expect(event.at).toBeGreaterThan(0);
      expect(event.label).toBeTruthy();
    });
  });
});
