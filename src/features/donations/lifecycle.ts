/**
 * DONUM — lifecycle state machines.
 *
 * The donation, request and delivery-task flows are defined here as explicit
 * transition maps rather than being implied by whichever call site happens to
 * set a status. Without this a stale browser tab, a double-tap, or a retried
 * request can drive a record backwards — marking an already-delivered donation
 * "matched" again, or completing a task that was never picked up — and the
 * timeline silently becomes fiction.
 *
 * These maps are also mirrored in `firestore.rules`, so the guarantee survives
 * a caller that bypasses this module entirely.
 */
import type { DonationStatus, RequestStatus, TaskStatus } from '@/types';

/** Terminal states: nothing may follow them. */
export const TERMINAL_DONATION_STATES: readonly DonationStatus[] = [
  'completed',
  'cancelled',
  'expired',
  'rejected',
];

/**
 * Donation flow (§10).
 *
 * `cancelled` is reachable from any live state — a donor can always withdraw
 * before handover. `expired` is reached by the scheduled sweep while a donation
 * is still unclaimed. `rejected` applies when a receiver declines a match, which
 * returns the donation to `matching` via a fresh matching run rather than being
 * a dead end for the record itself.
 */
export const DONATION_TRANSITIONS: Record<DonationStatus, readonly DonationStatus[]> = {
  created: ['matching', 'cancelled', 'expired'],
  matching: ['matched', 'cancelled', 'expired'],
  matched: ['accepted', 'rejected', 'matching', 'cancelled', 'expired'],
  accepted: ['pickup_scheduled', 'cancelled'],
  pickup_scheduled: ['picked_up', 'cancelled'],
  picked_up: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  expired: [],
  rejected: ['matching', 'cancelled', 'expired'],
};

/** Request flow (§14). */
export const REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  created: ['searching', 'cancelled'],
  searching: ['matched', 'cancelled'],
  // A partially-filled request keeps searching for the remainder.
  matched: ['fulfilled', 'searching', 'cancelled'],
  fulfilled: ['completed', 'searching'],
  completed: [],
  cancelled: [],
};

/** Volunteer delivery flow (§19) — strictly linear, no skipping. */
export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  available: ['accepted'],
  accepted: ['going_to_pickup', 'available'], // may be released back to the pool
  going_to_pickup: ['picked_up', 'available'],
  picked_up: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['completed'],
  completed: [],
};

function check<S extends string>(
  map: Record<S, readonly S[]>,
  from: S,
  to: S,
): boolean {
  if (from === to) return true; // idempotent re-write of the same state
  return (map[from] ?? []).includes(to);
}

export const canTransitionDonation = (from: DonationStatus, to: DonationStatus) =>
  check(DONATION_TRANSITIONS, from, to);

export const canTransitionRequest = (from: RequestStatus, to: RequestStatus) =>
  check(REQUEST_TRANSITIONS, from, to);

export const canTransitionTask = (from: TaskStatus, to: TaskStatus) =>
  check(TASK_TRANSITIONS, from, to);

/** Raised when a caller attempts a transition the state machine forbids. */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly entity: 'donation' | 'request' | 'task',
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid ${entity} transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertDonationTransition(from: DonationStatus, to: DonationStatus): void {
  if (!canTransitionDonation(from, to)) {
    throw new InvalidTransitionError('donation', from, to);
  }
}

export function assertRequestTransition(from: RequestStatus, to: RequestStatus): void {
  if (!canTransitionRequest(from, to)) {
    throw new InvalidTransitionError('request', from, to);
  }
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new InvalidTransitionError('task', from, to);
  }
}
