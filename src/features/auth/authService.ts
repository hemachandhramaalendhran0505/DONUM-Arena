/**
 * DONUM — authentication.
 *
 * Firebase Authentication (email/password + Google) when configured, with a
 * local credential store as the offline fallback. The public API is identical
 * either way: sign up, sign in, sign out, observe the session.
 */
import { isFirebaseConfigured } from '@/firebase/config';
import { getFirebaseAuth } from '@/firebase/app';
import type { SignUpPayload, UserProfile, UserRole } from '@/types';
import { createDoc, ensureSeeded, getDocById, updateDocById, uid } from '@/services/db';
import { localStore } from '@/services/localStore';
import type { StoredCredential } from '@/services/seed';

const SESSION_KEY = 'donum.session.uid';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password combination does not match an account.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Please choose a password with at least 6 characters.';
    case 'auth/invalid-email':
      return 'That email address looks incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    default:
      return 'Something went wrong while authenticating. Please try again.';
  }
}

function newProfile(id: string, payload: Omit<SignUpPayload, 'password'>): UserProfile {
  const t = Date.now();
  return {
    id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone ?? '',
    role: payload.role,
    location: '',
    latitude: 0,
    longitude: 0,
    verificationStatus: payload.role === 'donor' ? 'not_required' : 'pending',
    onboardingComplete: false,
    locationPermission: false,
    createdAt: t,
    updatedAt: t,
  };
}

// ---------------------------------------------------------------------------

export async function signUp(payload: SignUpPayload): Promise<UserProfile> {
  const email = payload.email.trim().toLowerCase();

  if (!isFirebaseConfigured) {
    ensureSeeded();
    const existing = localStore.find<StoredCredential>('credentials', (c) => c.email === email);
    if (existing.length) {
      throw new AuthError('An account with this email already exists. Try signing in instead.');
    }
    if (payload.password.length < 6) {
      throw new AuthError('Please choose a password with at least 6 characters.');
    }
    const id = uid('user');
    const profile = newProfile(id, { ...payload, email });
    localStore.insert('users', profile);
    localStore.insert<StoredCredential>('credentials', {
      id: uid('cred'),
      email,
      password: payload.password,
      userId: id,
    });
    setSession(id);
    return profile;
  }

  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const auth = await getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, payload.password);
    await updateProfile(cred.user, { displayName: payload.name });
    const profile = newProfile(cred.user.uid, { ...payload, email });
    await createDoc('users', profile);
    return profile;
  } catch (error) {
    throw new AuthError(friendlyError((error as { code?: string }).code ?? ''));
  }
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  const normalized = email.trim().toLowerCase();

  if (!isFirebaseConfigured) {
    ensureSeeded();
    const cred = localStore
      .find<StoredCredential>('credentials', (c) => c.email === normalized)
      .find((c) => c.password === password);
    if (!cred) {
      throw new AuthError('That email and password combination does not match an account.');
    }
    const profile = localStore.get<UserProfile>('users', cred.userId);
    if (!profile) throw new AuthError('This account no longer exists.');
    setSession(profile.id);
    return profile;
  }

  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const auth = await getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, normalized, password);
    const profile = await getDocById<UserProfile>('users', cred.user.uid);
    if (!profile) throw new AuthError('Your profile could not be loaded.');
    return profile;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(friendlyError((error as { code?: string }).code ?? ''));
  }
}

/** Google Sign-In. Architecture is wired; requires a configured Firebase project. */
export async function signInWithGoogle(role: UserRole = 'donor'): Promise<UserProfile> {
  if (!isFirebaseConfigured) {
    throw new AuthError(
      'Google Sign-In needs a configured Firebase project. Use email and password, or a demo account, in local mode.',
    );
  }
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const auth = await getFirebaseAuth();
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const existing = await getDocById<UserProfile>('users', result.user.uid);
    if (existing) return existing;
    const profile = newProfile(result.user.uid, {
      name: result.user.displayName ?? 'DONUM user',
      email: result.user.email ?? '',
      role,
      phone: result.user.phoneNumber ?? '',
    });
    await createDoc('users', profile);
    return profile;
  } catch (error) {
    throw new AuthError(friendlyError((error as { code?: string }).code ?? ''));
  }
}

export async function signOut(): Promise<void> {
  if (!isFirebaseConfigured) {
    clearSession();
    return;
  }
  const { signOut: fbSignOut } = await import('firebase/auth');
  await fbSignOut(await getFirebaseAuth());
}

export async function sendReset(email: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  const { sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(await getFirebaseAuth(), email.trim().toLowerCase());
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<UserProfile>,
): Promise<void> {
  await updateDocById<UserProfile>('users', userId, patch);
}

// --- session ---------------------------------------------------------------

/**
 * In-document session listeners.
 *
 * The `storage` event only fires in *other* tabs, so same-document sign-in and
 * sign-out must notify subscribers explicitly — otherwise the auth context
 * never learns about the new session and guarded routes bounce the user back
 * to the sign-in screen.
 */
const sessionListeners = new Set<() => void>();

function notifySessionChange() {
  sessionListeners.forEach((listener) => listener());
}

function setSession(userId: string) {
  try {
    localStorage.setItem(SESSION_KEY, userId);
  } catch {
    /* storage unavailable */
  }
  notifySessionChange();
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
  notifySessionChange();
}

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Observe the signed-in user's profile. Emits `null` when signed out and
 * re-emits whenever the underlying profile document changes.
 */
export function observeSession(next: (profile: UserProfile | null) => void): () => void {
  if (!isFirebaseConfigured) {
    ensureSeeded();
    const emit = () => {
      const id = readSession();
      next(id ? (localStore.get<UserProfile>('users', id) ?? null) : null);
    };
    emit();
    const unsubscribeUsers = localStore.subscribe<UserProfile>('users', emit);

    // Same-tab sign-in / sign-out.
    sessionListeners.add(emit);

    // Cross-tab session changes.
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) emit();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsubscribeUsers();
      sessionListeners.delete(emit);
      window.removeEventListener('storage', onStorage);
    };
  }

  let profileUnsub: (() => void) | null = null;
  let cancelled = false;

  const start = async () => {
    const { onAuthStateChanged } = await import('firebase/auth');
    const { doc, onSnapshot } = await import('firebase/firestore');
    const { getDb } = await import('@/firebase/app');
    const auth = await getFirebaseAuth();
    if (cancelled) return () => {};

    return onAuthStateChanged(auth, async (user) => {
      profileUnsub?.();
      profileUnsub = null;
      if (!user) {
        next(null);
        return;
      }
      const db = await getDb();
      profileUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        next(snap.exists() ? ({ ...snap.data(), id: snap.id } as UserProfile) : null);
      });
    });
  };

  let authUnsub: (() => void) | null = null;
  void start().then((fn) => {
    if (cancelled) fn?.();
    else authUnsub = fn ?? null;
  });

  return () => {
    cancelled = true;
    authUnsub?.();
    profileUnsub?.();
  };
}
