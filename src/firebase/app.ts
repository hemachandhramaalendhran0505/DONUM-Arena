/**
 * Lazily initialised Firebase singletons.
 *
 * Everything here is dynamic-imported so the Firebase SDK is never evaluated
 * (and never throws) when DONUM runs in local mode.
 */
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, isFirebaseConfigured } from './config';

let appPromise: Promise<FirebaseApp> | null = null;

export async function getFirebaseApp(): Promise<FirebaseApp> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. DONUM is running in local mode.');
  }
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      return getApps().length ? getApp() : initializeApp(firebaseConfig);
    })();
  }
  return appPromise;
}

export async function getFirebaseAuth(): Promise<Auth> {
  const { getAuth } = await import('firebase/auth');
  return getAuth(await getFirebaseApp());
}

export async function getDb(): Promise<Firestore> {
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore(await getFirebaseApp());
}

export async function getStorageInstance(): Promise<FirebaseStorage> {
  const { getStorage } = await import('firebase/storage');
  return getStorage(await getFirebaseApp());
}
