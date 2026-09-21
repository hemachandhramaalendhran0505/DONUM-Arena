/**
 * Push fan-out logic, kept free of the Firebase SDK so it can be tested.
 *
 * The behaviour that matters here is failure handling: one dead token must not
 * stop delivery to a user's other devices, and permanently rejected tokens must
 * be pruned or the array grows forever and every send reports failures.
 */

/** Shape of a single send result, mirroring FCM's BatchResponse entries. */
export interface SendResult {
  success: boolean;
  error?: { code?: string };
}

/**
 * FCM error codes that mean "this token will never work again".
 *
 * Deliberately narrow: transient conditions such as `messaging/internal-error`
 * or quota exhaustion must NOT prune a token, otherwise a temporary outage
 * silently unsubscribes the entire user base.
 */
export const PERMANENT_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
] as const;

export function isPermanentTokenError(code: string | undefined): boolean {
  return !!code && (PERMANENT_TOKEN_ERRORS as readonly string[]).includes(code);
}

/**
 * Given the tokens a push was sent to and the per-token results, return the
 * tokens that should be removed from the user's document.
 */
export function stalTokensFrom(tokens: string[], results: SendResult[]): string[] {
  const stale: string[] = [];
  results.forEach((result, index) => {
    if (!result.success && isPermanentTokenError(result.error?.code)) {
      const token = tokens[index];
      if (token && !stale.includes(token)) stale.push(token);
    }
  });
  return stale;
}

/** Deduplicate while preserving order; FCM rejects duplicate tokens in a batch. */
export function uniqueTokens(tokens: unknown): string[] {
  if (!Array.isArray(tokens)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (typeof t === 'string' && t.length > 0 && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
