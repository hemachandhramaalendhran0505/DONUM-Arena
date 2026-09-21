/**
 * Cloud Function push fan-out logic (§8).
 *
 * The functions package has no test runner of its own, so its pure logic is
 * exercised from the app suite via a relative import. This covers the parts
 * that are easy to get wrong and impossible to notice in production: a single
 * dead token must not block other devices, and a transient FCM error must not
 * cause a working device to be unsubscribed.
 */
import { describe, expect, it } from 'vitest';

import {
  isPermanentTokenError,
  stalTokensFrom,
  uniqueTokens,
  type SendResult,
} from '../../../functions/src/pushDelivery';

const ok: SendResult = { success: true };
const dead: SendResult = {
  success: false,
  error: { code: 'messaging/registration-token-not-registered' },
};
const transient: SendResult = { success: false, error: { code: 'messaging/internal-error' } };

describe('stale token detection', () => {
  it('prunes tokens FCM has permanently rejected', () => {
    const tokens = ['phone', 'laptop', 'old-tablet'];
    expect(stalTokensFrom(tokens, [ok, ok, dead])).toEqual(['old-tablet']);
  });

  it('keeps tokens that failed for transient reasons', () => {
    // Pruning on a temporary outage would silently unsubscribe real devices.
    const tokens = ['phone', 'laptop'];
    expect(stalTokensFrom(tokens, [transient, ok])).toEqual([]);
  });

  it('does not treat a successful send as stale', () => {
    expect(stalTokensFrom(['a', 'b'], [ok, ok])).toEqual([]);
  });

  it('lets one dead token coexist with successful deliveries', () => {
    // The spec is explicit: one bad token must not prevent delivery to the
    // valid devices. The send already happened per-token; this asserts we
    // only clean up the dead one.
    const tokens = ['dead', 'phone', 'laptop'];
    const stale = stalTokensFrom(tokens, [dead, ok, ok]);
    expect(stale).toEqual(['dead']);
    expect(tokens.filter((t) => !stale.includes(t))).toEqual(['phone', 'laptop']);
  });

  it('handles every token being dead', () => {
    expect(stalTokensFrom(['a', 'b'], [dead, dead])).toEqual(['a', 'b']);
  });

  it('classifies error codes correctly', () => {
    expect(isPermanentTokenError('messaging/registration-token-not-registered')).toBe(true);
    expect(isPermanentTokenError('messaging/invalid-registration-token')).toBe(true);
    expect(isPermanentTokenError('messaging/internal-error')).toBe(false);
    expect(isPermanentTokenError('messaging/quota-exceeded')).toBe(false);
    expect(isPermanentTokenError(undefined)).toBe(false);
  });
});

describe('token list hygiene', () => {
  it('removes duplicates, which FCM rejects in a batch', () => {
    expect(uniqueTokens(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('tolerates a missing or malformed field', () => {
    expect(uniqueTokens(undefined)).toEqual([]);
    expect(uniqueTokens(null)).toEqual([]);
    expect(uniqueTokens('not-an-array')).toEqual([]);
    expect(uniqueTokens(['ok', '', 42, null])).toEqual(['ok']);
  });
});
