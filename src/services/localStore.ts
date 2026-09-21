/**
 * DONUM — local realtime datastore.
 *
 * Mirrors the Firestore contract used by the services layer: documents live in
 * named collections, writes notify every active listener synchronously, and
 * state is persisted to localStorage so a refresh keeps your data. This is what
 * powers DONUM when Firebase credentials are not configured.
 */

export type Listener<T> = (docs: T[]) => void;

export interface Identified {
  id: string;
  createdAt?: number;
  updatedAt?: number;
}

const STORAGE_KEY = 'donum.db.v1';

type Database = Record<string, Identified[]>;

export type CollectionName =
  | 'users'
  | 'credentials'
  | 'donations'
  | 'requests'
  | 'matches'
  | 'tasks'
  | 'notifications';

class LocalStore {
  private db: Database = {};
  private listeners = new Map<string, Set<Listener<never>>>();
  private ready = false;
  private writeScheduled = false;

  /** Seed once, then hydrate from localStorage on subsequent loads. */
  init(seed: () => Database): void {
    if (this.ready) return;
    const persisted = this.load();
    this.db = persisted ?? seed();
    this.ready = true;
    if (!persisted) this.persist();
  }

  private load(): Database | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { version: number; data: Database };
      if (parsed?.version !== 1 || !parsed.data) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined' || this.writeScheduled) return;
    this.writeScheduled = true;
    queueMicrotask(() => {
      this.writeScheduled = false;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: this.db }));
      } catch {
        /* quota exceeded — keep running from memory */
      }
    });
  }

  reset(seed: () => Database): void {
    this.db = seed();
    this.persist();
    for (const name of Object.keys(this.db)) this.emit(name);
  }

  private col<T extends Identified>(name: CollectionName): T[] {
    if (!this.db[name]) this.db[name] = [];
    return this.db[name] as T[];
  }

  list<T extends Identified>(name: CollectionName): T[] {
    return [...this.col<T>(name)];
  }

  get<T extends Identified>(name: CollectionName, id: string): T | undefined {
    return this.col<T>(name).find((d) => d.id === id);
  }

  find<T extends Identified>(name: CollectionName, predicate: (doc: T) => boolean): T[] {
    return this.col<T>(name).filter(predicate);
  }

  insert<T extends Identified>(name: CollectionName, doc: T): T {
    this.col<T>(name).unshift(doc);
    this.persist();
    this.emit(name);
    return doc;
  }

  update<T extends Identified>(name: CollectionName, id: string, patch: Partial<T>): T | undefined {
    const collection = this.col<T>(name);
    const index = collection.findIndex((d) => d.id === id);
    if (index === -1) return undefined;
    const next = { ...collection[index], ...patch, updatedAt: Date.now() } as T;
    collection[index] = next;
    this.persist();
    this.emit(name);
    return next;
  }

  remove(name: CollectionName, id: string): void {
    const collection = this.col(name);
    const index = collection.findIndex((d) => d.id === id);
    if (index === -1) return;
    collection.splice(index, 1);
    this.persist();
    this.emit(name);
  }

  /** Batch several writes and emit only once per touched collection. */
  transaction(fn: () => void): void {
    const originalEmit = this.emit.bind(this);
    const touched = new Set<string>();
    this.emit = (name: string) => void touched.add(name);
    try {
      fn();
    } finally {
      this.emit = originalEmit;
      this.persist();
      touched.forEach((name) => this.emit(name));
    }
  }

  subscribe<T extends Identified>(name: CollectionName, listener: Listener<T>): () => void {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    const set = this.listeners.get(name)!;
    set.add(listener as Listener<never>);
    listener(this.list<T>(name));
    return () => {
      set.delete(listener as Listener<never>);
    };
  }

  private emit(name: string): void {
    const set = this.listeners.get(name);
    if (!set) return;
    const docs = this.list(name as CollectionName);
    set.forEach((listener) => (listener as Listener<Identified>)(docs));
  }
}

export const localStore = new LocalStore();

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
