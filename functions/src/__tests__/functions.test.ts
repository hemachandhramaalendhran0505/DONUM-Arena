/**
 * Cloud Function EXECUTION tests.
 *
 * These import the real `functions/src/index.ts`, stub only the two external
 * boundaries (Firestore and FCM), and then actually run the handler bodies.
 * That is the difference between "it compiles" and "it does what it claims":
 * every assertion below observes state the handler produced.
 *
 * The Firestore emulator is unavailable here (it is a Java binary; Java cannot
 * be installed in this sandbox), so a faithful in-memory Firestore stands in.
 * See fakeFirestore.ts for exactly what is and is not modelled.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeFirestore, FieldValueSentinels } from './fakeFirestore';

// --- boundary stubs, installed before the module under test is imported ----

// Single instance for the whole file: index.ts calls getFirestore() once at
// import time and holds that reference for the life of the process.
const store = new FakeFirestore();
const db = { current: store };
const sendEachForMulticast = vi.fn();

vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => db.current,
  FieldValue: FieldValueSentinels,
}));
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ sendEachForMulticast }),
}));
vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Capture the handlers the module registers, so they can be invoked directly.
const handlers: Record<string, (...args: any[]) => any> = {};
vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_spec: unknown, handler: any) => {
    handlers.sendNotificationPush = handler;
    return handler;
  },
}));
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (spec: string, handler: any) => {
    // Two scheduled functions; disambiguate by their documented cadence.
    handlers[spec.includes('60') ? 'expireStaleDonations' : 'pickupReminders'] = handler;
    return handler;
  },
}));

await import('../index');

const HOUR = 36e5;
const notificationEvent = (data: Record<string, unknown>) => ({
  data: { data: () => data },
});

beforeEach(() => {
  // Reset before each test. Nested describe blocks seed their fixtures in their
  // own beforeEach, which Vitest runs *after* this one, so the order is safe.
  store.reset();
  sendEachForMulticast.mockReset();
  sendEachForMulticast.mockResolvedValue({
    successCount: 1,
    failureCount: 0,
    responses: [{ success: true }],
  });
});

// --- §8 push fan-out -------------------------------------------------------

describe('sendNotificationPush', () => {
  it('sends to every registered device token', async () => {
    db.current.seed('users/u1', { fcmTokens: ['token-phone', 'token-laptop'] });
    sendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    });

    await handlers.sendNotificationPush(
      notificationEvent({ userId: 'u1', title: 'Matched', body: 'A match was found', kind: 'match' }),
    );

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    const payload = sendEachForMulticast.mock.calls[0][0];
    expect(payload.tokens).toEqual(['token-phone', 'token-laptop']);
    expect(payload.notification).toEqual({ title: 'Matched', body: 'A match was found' });
  });

  it('removes dead tokens but keeps the working ones', async () => {
    db.current.seed('users/u1', { fcmTokens: ['dead', 'phone', 'laptop'] });
    sendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 1,
      responses: [
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: true },
        { success: true },
      ],
    });

    await handlers.sendNotificationPush(
      notificationEvent({ userId: 'u1', title: 'T', body: 'B', kind: 'system' }),
    );

    // One invalid token must not block the other two, and must be pruned.
    expect(db.current.raw('users/u1')!.fcmTokens).toEqual(['phone', 'laptop']);
  });

  it('keeps tokens that failed for transient reasons', async () => {
    db.current.seed('users/u1', { fcmTokens: ['phone'] });
    sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [{ success: false, error: { code: 'messaging/internal-error' } }],
    });

    await handlers.sendNotificationPush(
      notificationEvent({ userId: 'u1', title: 'T', body: 'B', kind: 'system' }),
    );

    // A temporary outage must not unsubscribe a real device.
    expect(db.current.raw('users/u1')!.fcmTokens).toEqual(['phone']);
  });

  it('handles an empty token array without calling FCM', async () => {
    db.current.seed('users/u1', { fcmTokens: [] });
    await handlers.sendNotificationPush(
      notificationEvent({ userId: 'u1', title: 'T', body: 'B', kind: 'system' }),
    );
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('handles a user document that does not exist', async () => {
    await expect(
      handlers.sendNotificationPush(
        notificationEvent({ userId: 'ghost', title: 'T', body: 'B', kind: 'system' }),
      ),
    ).resolves.toBeUndefined();
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('ignores a malformed event without throwing', async () => {
    await expect(handlers.sendNotificationPush({ data: undefined })).resolves.toBeUndefined();
    await expect(handlers.sendNotificationPush(notificationEvent({}))).resolves.toBeUndefined();
  });

  it('deduplicates tokens, which FCM rejects in a batch', async () => {
    db.current.seed('users/u1', { fcmTokens: ['phone', 'phone', 'laptop'] });
    await handlers.sendNotificationPush(
      notificationEvent({ userId: 'u1', title: 'T', body: 'B', kind: 'system' }),
    );
    expect(sendEachForMulticast.mock.calls[0][0].tokens).toEqual(['phone', 'laptop']);
  });
});

// --- §9 expireStaleDonations ----------------------------------------------

describe('expireStaleDonations', () => {
  const now = Date.now();

  beforeEach(() => {
    db.current.seed('donations/stale', { status: 'created', expiryDate: now - HOUR, timeline: [] });
    db.current.seed('donations/matching_stale', { status: 'matching', expiryDate: now - 5 * HOUR, timeline: [] });
    db.current.seed('donations/fresh', { status: 'created', expiryDate: now + 48 * HOUR, timeline: [] });
    db.current.seed('donations/no_expiry', { status: 'created', timeline: [] });
    db.current.seed('donations/completed', { status: 'completed', expiryDate: now - HOUR, timeline: [] });
  });

  it('expires only donations past their window and still open', async () => {
    await handlers.expireStaleDonations();

    expect(db.current.raw('donations/stale')!.status).toBe('expired');
    expect(db.current.raw('donations/matching_stale')!.status).toBe('expired');
  });

  it('does not touch donations that are still valid', async () => {
    await handlers.expireStaleDonations();
    expect(db.current.raw('donations/fresh')!.status).toBe('created');
  });

  it('never sweeps a non-perishable donation with no expiry date', async () => {
    await handlers.expireStaleDonations();
    expect(db.current.raw('donations/no_expiry')!.status).toBe('created');
  });

  it('leaves already-completed donations alone', async () => {
    await handlers.expireStaleDonations();
    expect(db.current.raw('donations/completed')!.status).toBe('completed');
  });

  it('records a timeline entry explaining the expiry', async () => {
    await handlers.expireStaleDonations();
    const timeline = db.current.raw('donations/stale')!.timeline;
    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({ status: 'expired' });
  });

  it('is safe to run repeatedly', async () => {
    await handlers.expireStaleDonations();
    const afterFirst = db.current.writes.length;
    await handlers.expireStaleDonations();
    // Second pass finds nothing left to expire, so it writes nothing.
    expect(db.current.writes.length).toBe(afterFirst);
  });
});

// --- §9 pickupReminders (idempotency) --------------------------------------

describe('pickupReminders', () => {
  const now = Date.now();

  beforeEach(() => {
    db.current.seed('tasks/soon', {
      status: 'accepted',
      volunteerId: 'v1',
      title: 'Biryani pickup',
      donationId: 'd1',
      scheduledFor: now + 30 * 60 * 1000,
    });
    db.current.seed('tasks/later', {
      status: 'accepted',
      volunteerId: 'v2',
      title: 'Tomorrow',
      scheduledFor: now + 26 * HOUR,
    });
    db.current.seed('tasks/unassigned', {
      status: 'available',
      volunteerId: null,
      title: 'Nobody',
      scheduledFor: now + 20 * 60 * 1000,
    });
  });

  it('notifies the volunteer for an imminent pickup', async () => {
    await handlers.pickupReminders();
    const notes = db.current.entries('notifications');
    expect(notes).toHaveLength(1);
    expect(notes[0][1]).toMatchObject({ userId: 'v1', kind: 'pickup', read: false });
  });

  it('does not remind about pickups outside the hour window', async () => {
    await handlers.pickupReminders();
    const userIds = db.current.entries('notifications').map(([, d]) => d.userId);
    expect(userIds).not.toContain('v2');
  });

  it('skips tasks with no volunteer assigned', async () => {
    await handlers.pickupReminders();
    expect(db.current.entries('notifications')).toHaveLength(1);
  });

  it('does not send duplicates when run twice', async () => {
    await handlers.pickupReminders();
    await handlers.pickupReminders();
    await handlers.pickupReminders();

    // The function runs every 30 minutes over a 60 minute window, so without
    // the idempotency marker each volunteer would be reminded repeatedly.
    expect(db.current.entries('notifications')).toHaveLength(1);
  });

  it('records the idempotency marker on the task', async () => {
    await handlers.pickupReminders();
    expect(db.current.raw('tasks/soon')!.pickupReminderSentAt).toBeTypeOf('number');
  });

  it('does not remind about a task that already advanced past pickup', async () => {
    db.current.seed('tasks/gone', {
      status: 'delivered',
      volunteerId: 'v3',
      title: 'Done',
      scheduledFor: now + 10 * 60 * 1000,
    });
    await handlers.pickupReminders();
    const userIds = db.current.entries('notifications').map(([, d]) => d.userId);
    expect(userIds).not.toContain('v3');
  });
});
