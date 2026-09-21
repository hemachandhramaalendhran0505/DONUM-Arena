/**
 * DONUM — Cloud Functions.
 *
 * The web client writes notification documents; these functions turn them into
 * real device push messages via FCM, and run the scheduled maintenance that
 * cannot be trusted to a browser tab being open.
 *
 * Deploy:  cd functions && npm install && npm run deploy
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { stalTokensFrom, uniqueTokens } from './pushDelivery';

initializeApp();
const db = getFirestore();

interface NotificationDoc {
  userId: string;
  title: string;
  body: string;
  kind: string;
  link?: string;
}

/**
 * Fan a new notification document out to every device the user has registered.
 *
 * Tokens that FCM reports as unregistered are pruned, which keeps the token
 * array from growing stale as users change browsers or reinstall.
 */
export const sendNotificationPush = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    const notification = event.data?.data() as NotificationDoc | undefined;
    if (!notification?.userId) return;

    const userSnap = await db.doc(`users/${notification.userId}`).get();
    // Deduplicated: FCM rejects a batch containing the same token twice.
    const tokens = uniqueTokens(userSnap.get('fcmTokens'));

    if (tokens.length === 0) {
      logger.debug(`No FCM tokens registered for user ${notification.userId}`);
      return;
    }

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: notification.title, body: notification.body },
      data: {
        link: notification.link ?? '/app',
        kind: notification.kind ?? 'system',
      },
      webpush: {
        fcmOptions: { link: notification.link ?? '/app' },
        notification: { icon: '/donum-mark.svg', badge: '/donum-mark.svg' },
      },
    });

    // Prune only permanently-rejected tokens. Transient failures (quota,
    // internal errors) must not unsubscribe a working device.
    const stale = stalTokensFrom(tokens, response.responses);

    if (stale.length > 0) {
      await userSnap.ref.update({ fcmTokens: FieldValue.arrayRemove(...stale) });
      logger.info(`Pruned ${stale.length} stale token(s) for ${notification.userId}`);
    }

    logger.info(
      `Push sent to ${notification.userId}: ${response.successCount} ok, ${response.failureCount} failed`,
    );
  },
);

/**
 * Expire donations that passed their expiry while still unclaimed.
 *
 * The client sweeps opportunistically, but that only runs while someone has the
 * app open — this guarantees it happens.
 */
export const expireStaleDonations = onSchedule('every 60 minutes', async () => {
  const now = Date.now();
  const openStatuses = ['created', 'matching', 'matched'];

  // `where('expiryDate', '<', now)` already excludes documents missing the
  // field — Firestore range filters skip them — so non-perishable donations
  // are never swept. The orderBy makes that index requirement explicit.
  const snapshot = await db
    .collection('donations')
    .where('status', 'in', openStatuses)
    .where('expiryDate', '<', now)
    .orderBy('expiryDate')
    .limit(400)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'expired',
      updatedAt: now,
      timeline: FieldValue.arrayUnion({
        status: 'expired',
        label: 'Expired',
        at: now,
        note: 'Passed its expiry window before being collected.',
      }),
    });
  });

  await batch.commit();
  logger.info(`Expired ${snapshot.size} stale donation(s)`);
});

/**
 * Remind volunteers about pickups starting within the next hour.
 */
export const pickupReminders = onSchedule('every 30 minutes', async () => {
  const now = Date.now();
  const horizon = now + 36e5;

  const snapshot = await db
    .collection('tasks')
    .where('status', 'in', ['accepted', 'going_to_pickup'])
    .where('scheduledFor', '>=', now)
    .where('scheduledFor', '<=', horizon)
    .get();

  // Idempotency matters here: this runs every 30 minutes but looks an hour
  // ahead, so without a marker every task inside the window would be reminded
  // about twice. A transaction claims the flag and writes the notification
  // together, so overlapping or retried invocations cannot both send.
  const sent = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const volunteerId = doc.get('volunteerId');
      if (!volunteerId) return false;

      return db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (!fresh.exists || fresh.get('pickupReminderSentAt')) return false;
        // Re-read status inside the transaction: it may have advanced since
        // the query, in which case the reminder is no longer relevant.
        if (!['accepted', 'going_to_pickup'].includes(fresh.get('status'))) return false;

        tx.update(doc.ref, { pickupReminderSentAt: now });
        tx.create(db.collection('notifications').doc(), {
          userId: volunteerId,
          title: 'Pickup starting soon',
          body: `"${fresh.get('title')}" is scheduled for pickup within the hour.`,
          kind: 'pickup',
          link: `/app/tasks/${doc.id}`,
          donationId: fresh.get('donationId') ?? null,
          read: false,
          createdAt: now,
        });
        return true;
      });
    }),
  );

  const count = sent.filter(Boolean).length;
  if (count) logger.info(`Sent ${count} pickup reminder(s)`);
});
