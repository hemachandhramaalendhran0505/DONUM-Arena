/**
 * DONUM — data access layer.
 *
 * One API, two backends. Every call routes to Firestore when the project is
 * configured, and to the local realtime store otherwise. Both paths expose the
 * same `subscribe*` listener semantics so the UI code never branches.
 */
import { isFirebaseConfigured } from '@/firebase/config';
import { getDb } from '@/firebase/app';
import { localStore, uid, type CollectionName, type Identified } from './localStore';
import { buildSeed } from './seed';

export { uid };

let seeded = false;
export function ensureSeeded(): void {
  if (seeded || isFirebaseConfigured) return;
  localStore.init(() => buildSeed() as never);
  seeded = true;
}

export function resetDemoData(): void {
  if (isFirebaseConfigured) return;
  localStore.reset(() => buildSeed() as never);
}

// ---------------------------------------------------------------------------
// Firestore helpers (dynamically imported so local mode never loads the SDK)
// ---------------------------------------------------------------------------

async function fsCollection(name: string) {
  const { collection } = await import('firebase/firestore');
  return collection(await getDb(), name);
}

export async function createDoc<T extends Identified>(
  name: CollectionName,
  data: Omit<T, 'id'> & { id?: string },
): Promise<T> {
  const id = data.id ?? uid(name.slice(0, 3));
  const doc = { ...data, id, createdAt: data.createdAt ?? Date.now(), updatedAt: Date.now() } as T;

  if (!isFirebaseConfigured) {
    ensureSeeded();
    return localStore.insert<T>(name, doc);
  }

  const { doc: fsDoc, setDoc } = await import('firebase/firestore');
  const db = await getDb();
  await setDoc(fsDoc(db, name, id), doc);
  return doc;
}

export async function updateDocById<T extends Identified>(
  name: CollectionName,
  id: string,
  patch: Partial<T>,
): Promise<void> {
  if (!isFirebaseConfigured) {
    ensureSeeded();
    localStore.update<T>(name, id, patch);
    return;
  }
  const { doc: fsDoc, updateDoc } = await import('firebase/firestore');
  const db = await getDb();
  await updateDoc(fsDoc(db, name, id), { ...patch, updatedAt: Date.now() } as never);
}

export async function getDocById<T extends Identified>(
  name: CollectionName,
  id: string,
): Promise<T | undefined> {
  if (!isFirebaseConfigured) {
    ensureSeeded();
    return localStore.get<T>(name, id);
  }
  const { doc: fsDoc, getDoc } = await import('firebase/firestore');
  const db = await getDb();
  const snap = await getDoc(fsDoc(db, name, id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as T) : undefined;
}

export async function listDocs<T extends Identified>(name: CollectionName): Promise<T[]> {
  if (!isFirebaseConfigured) {
    ensureSeeded();
    return localStore.list<T>(name);
  }
  const { getDocs } = await import('firebase/firestore');
  const snap = await getDocs(await fsCollection(name));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
}

export async function deleteDocById(name: CollectionName, id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    ensureSeeded();
    localStore.remove(name, id);
    return;
  }
  const { doc: fsDoc, deleteDoc } = await import('firebase/firestore');
  const db = await getDb();
  await deleteDoc(fsDoc(db, name, id));
}

/**
 * Realtime subscription to a whole collection.
 * Returns an unsubscribe function (sync, like onSnapshot).
 */
export function subscribeCollection<T extends Identified>(
  name: CollectionName,
  next: (docs: T[]) => void,
): () => void {
  if (!isFirebaseConfigured) {
    ensureSeeded();
    return localStore.subscribe<T>(name, next);
  }

  let unsub: (() => void) | null = null;
  let cancelled = false;

  void (async () => {
    const { onSnapshot } = await import('firebase/firestore');
    if (cancelled) return;
    const col = await fsCollection(name);
    unsub = onSnapshot(
      col,
      (snap) => next(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T)),
      (error) => console.error(`[DONUM] listener failed on ${name}`, error),
    );
  })();

  return () => {
    cancelled = true;
    unsub?.();
  };
}

/** Run several local writes as one atomic notification burst. */
export function batch(fn: () => void): void {
  if (!isFirebaseConfigured) {
    localStore.transaction(fn);
    return;
  }
  fn();
}
