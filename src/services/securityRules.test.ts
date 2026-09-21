/**
 * Firestore security rules — static verification (§23).
 *
 * The behavioural way to test rules is `@firebase/rules-unit-testing` against
 * the emulator. That is deliberately not used here: it requires firebase v12
 * (this project is on v10) and a JVM to run the emulator, neither of which is
 * available in CI for this repo. Rather than claim coverage that does not
 * exist, these tests verify the properties that can be checked statically —
 * structural validity, and the specific authorisation holes that were found
 * during the audit and fixed.
 *
 * Each test below corresponds to a real vulnerability that existed in this
 * file, so a regression reintroducing one fails the suite. The README states
 * plainly which guarantees are emulator-verified and which are not.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');
const STORAGE_RULES = readFileSync(join(process.cwd(), 'storage.rules'), 'utf8');

/** Strip comments so assertions never match commentary instead of policy. */
const code = RULES.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function blockFor(collection: string): string {
  const start = code.indexOf(`match /${collection}/{`);
  expect(start, `no rules block for ${collection}`).toBeGreaterThan(-1);
  // Begin counting at the block's opening brace, not at the `match /x/{y}`
  // path placeholder, which would otherwise close the block immediately.
  const open = code.indexOf('{', code.indexOf('}', start));
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${collection} block`);
}

describe('rules file is structurally valid', () => {
  it('declares the rules version and service', () => {
    expect(code).toContain("rules_version = '2'");
    expect(code).toContain('service cloud.firestore');
  });

  it('has balanced braces and parentheses', () => {
    const count = (ch: string) => [...code].filter((c) => c === ch).length;
    expect(count('{'), 'unbalanced braces').toBe(count('}'));
    expect(count('('), 'unbalanced parens').toBe(count(')'));
  });

  it('covers every collection the application writes to', () => {
    for (const c of ['users', 'donations', 'requests', 'matches', 'tasks', 'notifications']) {
      expect(code, `missing rules for ${c}`).toContain(`match /${c}/{`);
    }
  });

  it('never leaves a write rule permanently open', () => {
    // `allow write: if true` (or read+write) would defeat the entire ruleset.
    expect(code).not.toMatch(/allow\s+(write|create|update|delete)[^:]*:\s*if\s+true\s*;/);
  });
});

describe('users cannot escalate their own privileges', () => {
  const users = blockFor('users');

  it('blocks self-approval of verification status', () => {
    expect(users).toContain("unchanged('verificationStatus')");
  });

  it('blocks changing your own role after creation', () => {
    expect(users).toContain("unchanged('role')");
  });

  it('forces new accounts to start unverified', () => {
    expect(users).toMatch(/verificationStatus in \['pending', 'not_required'\]/);
  });

  it('never allows deleting a user document from the client', () => {
    expect(users).toMatch(/allow delete:\s*if false/);
  });
});

describe('donations are writable only by their parties', () => {
  const donations = blockFor('donations');

  it('does not grant write access to every user holding the volunteer role', () => {
    // The original hole: `myRole() == 'volunteer'` let any volunteer mutate
    // any donation in the system.
    expect(donations).not.toMatch(/myRole\(\)\s*==\s*'volunteer'/);
    expect(donations).toContain('assignedVolunteerId');
  });

  it('pins ownership so donorId cannot be reassigned', () => {
    expect(donations).toContain('request.resource.data.donorId == resource.data.donorId');
  });

  it('enforces the documented lifecycle server-side', () => {
    expect(donations).toContain('legalTransition()');
    // A representative sample of the state machine must be present.
    expect(donations).toContain("from == 'picked_up'");
    expect(donations).toContain("from == 'delivered'");
  });

  it('does not permit skipping the chain of custody', () => {
    // There must be no rule permitting accepted -> delivered directly.
    expect(donations).not.toMatch(/from == 'accepted'\s*&&\s*to in \[[^\]]*'delivered'/);
  });
});

describe('requests cannot be rewritten by arbitrary users', () => {
  const requests = blockFor('requests');

  it('requires the fulfilment path to be a donor, not merely signed in', () => {
    expect(requests).toContain("myRole() == 'donor'");
    expect(requests).toContain('isFulfilmentUpdate()');
  });

  it('pins the requestor so ownership cannot move', () => {
    expect(requests).toContain('request.resource.data.requestorId == resource.data.requestorId');
  });

  it('enforces the request lifecycle', () => {
    expect(requests).toContain('legalRequestTransition()');
  });
});

describe('delivery tasks cannot be hijacked', () => {
  const tasks = blockFor('tasks');

  it('does not let an NGO seize a task another volunteer is running', () => {
    // The original hole: `myRole() in ['ngo', 'requestor']` on update.
    expect(tasks).not.toMatch(/myRole\(\) in \['ngo', 'requestor'\]/);
  });

  it('only lets a volunteer claim a task that is unclaimed', () => {
    expect(tasks).toContain('isUnclaimed()');
    expect(tasks).toContain('request.resource.data.volunteerId == request.auth.uid');
  });

  it('enforces the linear volunteer lifecycle', () => {
    expect(tasks).toContain('legalTaskTransition()');
    expect(tasks).not.toMatch(/from == 'available'\s*&&\s*to in \[[^\]]*'completed'/);
  });
});

describe('notifications cannot be forged', () => {
  const notifications = blockFor('notifications');

  it('requires the sender to be a counterparty on the donation', () => {
    expect(notifications).toContain('notifiesCounterparty()');
  });

  it('forces new notifications to be unread', () => {
    expect(notifications).toContain('request.resource.data.read == false');
  });

  it('keeps reads private to the recipient', () => {
    expect(notifications).toMatch(/allow read:\s*if isSignedIn\(\)\s*&& resource\.data\.userId == request\.auth\.uid/);
  });

  it('limits recipient updates to the read flag', () => {
    expect(notifications).toContain("hasOnly(['read', 'readAt', 'updatedAt'])");
  });
});

describe('match scores are engine output, not user input', () => {
  it('restricts client match updates to status only', () => {
    expect(blockFor('matches')).toContain("hasOnly(['status', 'updatedAt'])");
  });
});

describe('storage rules constrain uploads', () => {
  it('limits size and enforces image content types', () => {
    expect(STORAGE_RULES).toContain('request.resource.size');
    expect(STORAGE_RULES).toContain("contentType.matches('image/.*')");
  });

  it('denies everything outside the two known prefixes', () => {
    expect(STORAGE_RULES).toMatch(/match \/\{allPaths=\*\*\}[\s\S]*allow read, write: if false/);
  });
});
