/**
 * A minimal in-memory stand-in for the Firestore admin SDK.
 *
 * The real Firestore emulator is a Java binary, and Java cannot be installed in
 * this environment (apt, the Oracle CDN and the GitHub asset host are all
 * blocked). Rather than skip execution entirely, the function handlers are run
 * against this fake: it is not Firestore, but it does mean the handler bodies
 * genuinely execute — queries, batches, transactions, field transforms and
 * error paths — instead of merely compiling.
 *
 * What it deliberately models faithfully:
 *  - `where('x','<',n)` skips documents missing `x` entirely, like Firestore.
 *  - `arrayUnion` / `arrayRemove` behave as set operations.
 *  - `transaction.get` reads the live document, so idempotency markers written
 *    by an earlier run are visible to a later one.
 */

type Data = Record<string, any>;

export const FieldValueSentinels = {
  arrayUnion: (...values: unknown[]) => ({ __op: 'arrayUnion', values }),
  arrayRemove: (...values: unknown[]) => ({ __op: 'arrayRemove', values }),
};

function applyOps(current: Data, patch: Data): Data {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && '__op' in value) {
      const existing: unknown[] = Array.isArray(next[key]) ? [...next[key]] : [];
      if (value.__op === 'arrayUnion') {
        for (const v of (value as any).values) {
          if (!existing.some((e) => JSON.stringify(e) === JSON.stringify(v))) existing.push(v);
        }
      } else if (value.__op === 'arrayRemove') {
        const removed = existing.filter(
          (e) => !(value as any).values.some((v: unknown) => JSON.stringify(e) === JSON.stringify(v)),
        );
        existing.length = 0;
        existing.push(...removed);
      }
      next[key] = existing;
    } else {
      next[key] = value;
    }
  }
  return next;
}

export class FakeSnapshot {
  constructor(
    public readonly id: string,
    private readonly store: FakeFirestore,
    private readonly path: string,
    private readonly data_: Data | undefined,
  ) {}
  get exists() {
    return this.data_ !== undefined;
  }
  data() {
    return this.data_;
  }
  get(field: string) {
    return this.data_?.[field];
  }
  get ref() {
    return this.store.doc(this.path);
  }
}

class FakeDocRef {
  constructor(
    private readonly store: FakeFirestore,
    public readonly path: string,
  ) {}
  get id() {
    return this.path.split('/').pop()!;
  }
  async get() {
    return new FakeSnapshot(this.id, this.store, this.path, this.store.raw(this.path));
  }
  async set(data: Data) {
    this.store.write(this.path, data);
  }
  async update(patch: Data) {
    const current = this.store.raw(this.path);
    if (current === undefined) throw new Error(`No document to update: ${this.path}`);
    this.store.write(this.path, applyOps(current, patch));
  }
}

class FakeQuery {
  constructor(
    private readonly store: FakeFirestore,
    private readonly collection: string,
    private readonly filters: Array<[string, string, any]> = [],
    private readonly limit_?: number,
  ) {}
  where(field: string, op: string, value: any) {
    return new FakeQuery(this.store, this.collection, [...this.filters, [field, op, value]], this.limit_);
  }
  orderBy(_field: string) {
    return this;
  }
  limit(n: number) {
    return new FakeQuery(this.store, this.collection, this.filters, n);
  }
  async get() {
    let docs = this.store.entries(this.collection);
    for (const [field, op, value] of this.filters) {
      docs = docs.filter(([, data]) => {
        const actual = data[field];
        // Firestore range filters exclude documents missing the field.
        if (actual === undefined || actual === null) return false;
        switch (op) {
          case '<':
            return actual < value;
          case '<=':
            return actual <= value;
          case '>':
            return actual > value;
          case '>=':
            return actual >= value;
          case '==':
            return actual === value;
          case 'in':
            return (value as unknown[]).includes(actual);
          default:
            throw new Error(`unsupported op ${op}`);
        }
      });
    }
    if (this.limit_ !== undefined) docs = docs.slice(0, this.limit_);
    const snaps = docs.map(
      ([path, data]) => new FakeSnapshot(path.split('/').pop()!, this.store, path, data),
    );
    return { empty: snaps.length === 0, size: snaps.length, docs: snaps };
  }
}

class FakeCollection extends FakeQuery {
  constructor(
    private readonly store2: FakeFirestore,
    private readonly name: string,
  ) {
    super(store2, name);
  }
  doc(id?: string) {
    const docId = id ?? `auto_${Math.random().toString(36).slice(2, 10)}`;
    return this.store2.doc(`${this.name}/${docId}`);
  }
  async add(data: Data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

export class FakeFirestore {
  private data = new Map<string, Data>();
  /** Every write, for asserting call counts. */
  public writes: string[] = [];

  /**
   * Clear in place.
   *
   * The module under test captures `getFirestore()` once at import time, so
   * replacing the instance between tests would leave the handlers writing to
   * an orphaned store while assertions read a fresh one.
   */
  reset() {
    this.data.clear();
    this.writes = [];
  }

  raw(path: string) {
    return this.data.get(path);
  }
  write(path: string, value: Data) {
    this.data.set(path, value);
    this.writes.push(path);
  }
  seed(path: string, value: Data) {
    this.data.set(path, value);
  }
  entries(collection: string): Array<[string, Data]> {
    return [...this.data.entries()].filter(([path]) => path.startsWith(`${collection}/`));
  }
  doc(path: string) {
    return new FakeDocRef(this, path) as any;
  }
  collection(name: string) {
    return new FakeCollection(this, name) as any;
  }
  batch() {
    const ops: Array<() => void> = [];
    const self = this;
    return {
      update(ref: any, patch: Data) {
        ops.push(() => {
          const current = self.raw(ref.path) ?? {};
          self.write(ref.path, applyOps(current, patch));
        });
      },
      async commit() {
        ops.forEach((op) => op());
      },
    };
  }
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const self = this;
    const tx = {
      async get(ref: any) {
        return ref.get();
      },
      update(ref: any, patch: Data) {
        const current = self.raw(ref.path) ?? {};
        self.write(ref.path, applyOps(current, patch));
      },
      create(ref: any, data: Data) {
        self.write(ref.path, data);
      },
    };
    return fn(tx);
  }
}
