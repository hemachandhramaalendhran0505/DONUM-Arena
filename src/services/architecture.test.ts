/**
 * Architecture guard.
 *
 * The project is laid out as `features/` (domain capabilities) sitting on top of
 * `services/` (infrastructure: the storage port, its browser adapter, the demo
 * dataset). That only stays true if something checks it, so this test reads the
 * source and fails the build when an import points the wrong way.
 *
 * Without this, a single convenient import inside `db.ts` would quietly invert
 * the dependency and make the storage layer impossible to test or replace in
 * isolation — the kind of drift that is invisible in review and expensive later.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return filesUnder(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Module specifiers imported by a file, e.g. `@/features/matching/engine`. */
function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
}

const rel = (file: string) => file.slice(SRC.length + 1).replace(/\\/g, '/');

describe('architecture', () => {
  it('keeps the storage layer free of feature imports', () => {
    // seed.ts is the documented exception: it runs the real matching engine so
    // demo scores are computed, not faked. Everything else must stay clean.
    const offenders = filesUnder(join(SRC, 'services'))
      .filter((f) => !rel(f).startsWith('services/seed'))
      .flatMap((file) =>
        importsOf(file)
          .filter((spec) => spec.startsWith('@/features'))
          .map((spec) => `${rel(file)} imports ${spec}`),
      );

    expect(offenders).toEqual([]);
  });

  it('keeps domain and infrastructure free of UI imports', () => {
    // Services and non-component feature modules must not reach into pages or
    // components, otherwise the domain can no longer run headless (tests, Cloud
    // Functions, a future CLI) without dragging React along.
    const headless = [
      ...filesUnder(join(SRC, 'services')),
      ...filesUnder(join(SRC, 'features')).filter((f) => f.endsWith('.ts')),
    ];

    const offenders = headless.flatMap((file) =>
      importsOf(file)
        .filter((spec) => spec.startsWith('@/pages') || spec.startsWith('@/components'))
        .map((spec) => `${rel(file)} imports ${spec}`),
    );

    expect(offenders).toEqual([]);
  });

  it('exposes every domain capability named in the architecture', () => {
    // The seven feature folders the product spec calls for. A missing one means
    // logic drifted back into a catch-all module.
    const expected = [
      'auth',
      'donations',
      'requests',
      'matching',
      'tracking',
      'notifications',
      'analytics',
    ].sort();

    const actual = readdirSync(join(SRC, 'features'))
      .filter((entry) => statSync(join(SRC, 'features', entry)).isDirectory())
      .sort();

    expect(actual).toEqual(expected);
  });
});
