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
    const tokens: string[] = userSnap.get('fcmTokens') ?? [];

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

    // Prune tokens FCM has permanently rejected.
    const stale: string[] = [];
    response.responses.forEach((result, index) => {
      const code = result.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        stale.push(tokens[index]);
      }
    });

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

  const snapshot = await db
    .collection('donations')
    .where('status', 'in', openStatuses)
    .where('expiryDate', '<', now)
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

  const writes = snapshot.docs
    .filter((doc) => doc.get('volunteerId'))
    .map((doc) =>
      db.collection('notifications').add({
        userId: doc.get('volunteerId'),
        title: 'Pickup starting soon',
        body: `"${doc.get('title')}" is scheduled for pickup within the hour.`,
        kind: 'pickup',
        link: `/app/tasks/${doc.id}`,
        read: false,
        createdAt: Date.now(),
      }),
    );

  await Promise.all(writes);
  if (writes.length) logger.info(`Sent ${writes.length} pickup reminder(s)`);
});
