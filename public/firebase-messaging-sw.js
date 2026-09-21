/* eslint-disable no-undef */
/**
 * DONUM — Firebase Cloud Messaging service worker.
 *
 * Handles background web-push notifications. Replace the config values below
 * with your Firebase project's web config (they are public by design).
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.DONUM_FIREBASE_API_KEY || '',
  authDomain: self.DONUM_FIREBASE_AUTH_DOMAIN || '',
  projectId: self.DONUM_FIREBASE_PROJECT_ID || '',
  storageBucket: self.DONUM_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.DONUM_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.DONUM_FIREBASE_APP_ID || '',
});

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'DONUM';
    self.registration.showNotification(title, {
      body: payload.notification?.body || '',
      icon: '/donum-mark.svg',
      badge: '/donum-mark.svg',
      data: payload.data || {},
    });
  });
} catch (error) {
  // Messaging is unavailable until a real Firebase config is provided.
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/app';
  event.waitUntil(clients.openWindow(link));
});
