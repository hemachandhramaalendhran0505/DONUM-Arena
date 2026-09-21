/**
 * Firebase Cloud Messaging (web push).
 *
 * Registers the service worker, requests permission and hands the FCM token to
 * the caller so it can be persisted on the user document. In local mode the
 * in-app notification centre still works — only the push transport is skipped.
 */
import { fcmVapidKey, isFirebaseConfigured } from './config';
import { getFirebaseApp } from './app';

export type PushPermission = 'granted' | 'denied' | 'unsupported' | 'unconfigured';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** Ask for notification permission and return an FCM registration token. */
export async function enablePush(): Promise<{ permission: PushPermission; token?: string }> {
  if (!pushSupported()) return { permission: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission: 'denied' };
  if (!isFirebaseConfigured || !fcmVapidKey) return { permission: 'unconfigured' };

  try {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return { permission: 'unsupported' };

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(await getFirebaseApp());
    const token = await getToken(messaging, {
      vapidKey: fcmVapidKey,
      serviceWorkerRegistration: registration,
    });
    return { permission: 'granted', token };
  } catch (error) {
    console.warn('[DONUM] FCM token request failed', error);
    return { permission: 'granted' };
  }
}

/** Subscribe to foreground push messages. Returns an unsubscribe function. */
export async function onForegroundPush(
  handler: (payload: { title?: string; body?: string }) => void,
): Promise<() => void> {
  if (!isFirebaseConfigured) return () => {};
  try {
    const { getMessaging, onMessage, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return () => {};
    const messaging = getMessaging(await getFirebaseApp());
    return onMessage(messaging, (payload) =>
      handler({ title: payload.notification?.title, body: payload.notification?.body }),
    );
  } catch {
    return () => {};
  }
}

/** Show a local OS notification (used as the local-mode push transport). */
export function showLocalNotification(title: string, body: string): void {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/donum-mark.svg', badge: '/donum-mark.svg' });
  } catch {
    /* notification constructor is unavailable in some browsers */
  }
}
