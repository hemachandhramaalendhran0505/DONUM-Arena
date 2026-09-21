import type { Donation, Urgency } from '@/types';

const HOUR = 36e5;

/**
 * Derive how urgently a donation needs to move.
 *
 * Requests carry an explicit urgency set by the requestor, but a donation's
 * urgency is a function of real time pressure: how soon it spoils, and how
 * soon its pickup window opens. This is what NGOs need to triage a list of
 * available donations (spec §11), and it is deliberately conservative —
 * non-perishables with a distant pickup are never marked urgent.
 */
export function donationUrgency(donation: Donation, now = Date.now()): Urgency {
  const hoursToExpiry = donation.expiryDate ? (donation.expiryDate - now) / HOUR : Infinity;
  const hoursToPickup = (donation.pickupDate - now) / HOUR;

  // Perishables dominate: something spoiling today must move today.
  if (hoursToExpiry <= 12) return 'critical';
  if (hoursToExpiry <= 24) return 'high';

  // Otherwise the pickup window drives it.
  if (hoursToPickup <= 6) return 'high';
  if (hoursToExpiry <= 72 || hoursToPickup <= 48) return 'medium';

  return 'low';
}

/** Rank used for sorting most-urgent-first. */
export const URGENCY_RANK: Record<Urgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
