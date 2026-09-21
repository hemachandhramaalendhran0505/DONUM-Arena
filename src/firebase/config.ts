/**
 * DONUM — Firebase configuration.
 *
 * Credentials are supplied through Vite env vars (see .env.example). When they
 * are absent DONUM transparently falls back to a local, offline-first backend
 * that implements the exact same realtime contract, so the product is always
 * runnable — in a demo, in CI, or on a plane — and upgrades to real Firebase
 * the moment the keys are present. No code changes required.
 */

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const env = import.meta.env;

export const firebaseConfig: FirebaseEnvConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
};

/** True only when a complete, usable Firebase project is configured. */
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.authDomain,
);

/** Google Maps JS API key — optional; DONUM renders a schematic map without it. */
export const googleMapsApiKey: string = env.VITE_GOOGLE_MAPS_API_KEY ?? '';

/** Web push (FCM) VAPID key — optional. */
export const fcmVapidKey: string = env.VITE_FIREBASE_VAPID_KEY ?? '';

export const backendMode: 'firebase' | 'local' = isFirebaseConfigured ? 'firebase' : 'local';
