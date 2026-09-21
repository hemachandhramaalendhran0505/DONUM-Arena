import type { AppNotification, NotificationKind } from '@/types';
import { createDoc, subscribeCollection, updateDocById, listDocs } from './db';
import { showLocalNotification } from '@/firebase/messaging';
import { isFirebaseConfigured } from '@/firebase/config';

export interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  kind: NotificationKind;
  link?: string;
}

/**
 * Create an in-app notification. In local mode this also fires an OS
 * notification so the push experience is real; with Firebase configured the
 * same document is what a Cloud Function would fan out over FCM.
 */
export async function notify(input: NotifyInput): Promise<void> {
  await createDoc<AppNotification>('notifications', { ...input, read: false, createdAt: Date.now() });
  if (!isFirebaseConfigured) showLocalNotification(input.title, input.body);
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  await Promise.all(inputs.map(notify));
}

export function subscribeNotifications(
  userId: string,
  next: (items: AppNotification[]) => void,
): () => void {
  return subscribeCollection<AppNotification>('notifications', (all) => {
    next(
      all.filter((n) => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt),
    );
  });
}

export async function markRead(id: string): Promise<void> {
  await updateDocById<AppNotification>('notifications', id, { read: true });
}

export async function markAllRead(userId: string): Promise<void> {
  const all = await listDocs<AppNotification>('notifications');
  await Promise.all(
    all.filter((n) => n.userId === userId && !n.read).map((n) => markRead(n.id)),
  );
}
