/**
 * DONUM — Intelligent Matching Engine.
 *
 * DONUM does not match on distance alone. Every donation/request pair is scored
 * across five weighted dimensions and stored with a full breakdown so the
 * decision is auditable and explainable:
 *
 *   match_score = 0.30 x distance + 0.25 x urgency + 0.20 x category
 *               + 0.15 x quantity + 0.10 x expiry
 *
 * All weights are configurable (see DEFAULT_WEIGHTS / normalizeWeights).
 */

import type {
  Donation,
  DonationCategory,
  MatchScoreBreakdown,
  MatchingWeights,
  ResourceRequest,
  Urgency,
} from '@/types';
import { roadDistanceKm } from '@/utils/geo';

export const DEFAULT_WEIGHTS: MatchingWeights = {
  distance: 0.3,
  urgency: 0.25,
  category: 0.2,
  quantity: 0.15,
  expiry: 0.1,
};

/** Pairs of categories that can reasonably substitute for one another. */
const RELATED_CATEGORIES: Record<DonationCategory, DonationCategory[]> = {
  food_items: ['groceries'],
  groceries: ['food_items', 'essentials'],
  clothes: ['essentials'],
  essentials: ['clothes', 'groceries'],
  animal_food: ['food_items'],
  other: [],
};

const URGENCY_SCORES: Record<Urgency, number> = {
  critical: 1,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
};

/** Weights are normalised so custom configurations always sum to 1. */
export function normalizeWeights(weights: MatchingWeights): MatchingWeights {
  const total =
    weights.distance + weights.urgency + weights.category + weights.quantity + weights.expiry;
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    distance: weights.distance / total,
    urgency: weights.urgency / total,
    category: weights.category / total,
    quantity: weights.quantity / total,
    expiry: weights.expiry / total,
  };
}

/**
 * Distance score — closer is better.
 *  < 2 km -> 1.0 | 2-5 -> 0.8 | 5-10 -> 0.6 | 10-20 -> 0.4 | > 20 -> 0.2
 */
export function distanceScore(km: number): number {
  if (km < 2) return 1;
  if (km <= 5) return 0.8;
  if (km <= 10) return 0.6;
  if (km <= 20) return 0.4;
  return 0.2;
}

/** Urgency score — critical requests bubble to the top. */
export function urgencyScore(urgency: Urgency): number {
  return URGENCY_SCORES[urgency] ?? 0.2;
}

/** Category match — exact 1.0, related 0.5, otherwise 0. */
export function categoryScore(
  donationCategory: DonationCategory,
  requestCategory: DonationCategory,
): number {
  if (donationCategory === requestCategory) return 1;
  if (RELATED_CATEGORIES[donationCategory]?.includes(requestCategory)) return 0.5;
  if (donationCategory === 'other' || requestCategory === 'other') return 0.25;
  return 0;
}

/**
 * Quantity match — how well the donation satisfies what was asked for.
 * A perfect or slightly generous donation scores 1.0; partial coverage scales
 * linearly; heavily oversized donations are gently penalised because the
 * surplus would have to be redistributed again.
 */
export function quantityScore(donationQuantity: number, requestedQuantity: number): number {
  if (requestedQuantity <= 0 || donationQuantity <= 0) return 0;
  const ratio = donationQuantity / requestedQuantity;
  if (ratio >= 1 && ratio <= 1.5) return 1;
  if (ratio > 1.5) return Math.max(0.55, 1 - (ratio - 1.5) * 0.12);
  // Partial fulfilment: 50% coverage -> 0.5, but never below 0.1 for a real offer.
  return Math.max(0.1, ratio);
}

/**
 * Expiry score — perishable donations that are close to expiring should be
 * routed first, but anything already expired scores 0. Non-perishable
 * donations get a neutral-positive baseline.
 */
export function expiryScore(expiryDate: number | undefined, now = Date.now()): number {
  if (!expiryDate) return 0.5;
  const hoursLeft = (expiryDate - now) / 36e5;
  if (hoursLeft <= 0) return 0;
  if (hoursLeft <= 12) return 1;
  if (hoursLeft <= 24) return 0.9;
  if (hoursLeft <= 48) return 0.75;
  if (hoursLeft <= 24 * 7) return 0.6;
  return 0.45;
}

/** Deadline pressure: a request needed sooner than the donation can spoil is urgent. */
function deadlineIsCompatible(donation: Donation, request: ResourceRequest): boolean {
  if (!donation.expiryDate) return true;
  // The resource must still be good by the time it's needed.
  return donation.expiryDate >= Math.min(request.requiredBy, donation.pickupDate);
}

const CATEGORY_LABELS: Record<DonationCategory, string> = {
  food_items: 'food items',
  clothes: 'clothes',
  groceries: 'groceries',
  essentials: 'essentials',
  animal_food: 'animal food',
  other: 'other supplies',
};

function buildReasons(b: Omit<MatchScoreBreakdown, 'explanation' | 'reasons'>, urgency: Urgency) {
  const reasons: string[] = [];

  if (b.distanceScore >= 0.8) reasons.push(`only ${b.distanceKm.toFixed(1)} km away`);
  else if (b.distanceScore >= 0.6) reasons.push(`a short ${b.distanceKm.toFixed(1)} km trip`);
  else reasons.push(`${b.distanceKm.toFixed(1)} km away`);

  if (b.urgencyScore >= 0.8) reasons.push(`the request is ${urgency} priority`);
  else if (b.urgencyScore >= 0.5) reasons.push('the request has moderate urgency');

  if (b.categoryScore === 1) reasons.push('the category matches exactly');
  else if (b.categoryScore >= 0.5) reasons.push('the categories are closely related');

  if (b.quantityScore >= 0.95) reasons.push('the quantity covers the need');
  else if (b.quantityScore >= 0.5) reasons.push('the quantity covers a good part of the need');

  if (b.expiryScore >= 0.9) reasons.push('the donation should be collected soon');

  return reasons;
}

/** Turn a breakdown into a sentence a normal user can read. */
export function explainMatch(
  b: Omit<MatchScoreBreakdown, 'explanation' | 'reasons'>,
  urgency: Urgency,
): { explanation: string; reasons: string[] } {
  const reasons = buildReasons(b, urgency);
  const listed =
    reasons.length > 1
      ? `${reasons.slice(0, -1).join(', ')} and ${reasons[reasons.length - 1]}`
      : reasons[0] ?? 'it is the closest available option';
  return { explanation: `Matched because ${listed}.`, reasons };
}

export interface ScoreOptions {
  weights?: MatchingWeights;
  now?: number;
}

/** Score a single donation/request pair and produce a full, storable breakdown. */
export function scoreMatch(
  donation: Donation,
  request: ResourceRequest,
  options: ScoreOptions = {},
): MatchScoreBreakdown {
  const weights = normalizeWeights(options.weights ?? DEFAULT_WEIGHTS);
  const now = options.now ?? Date.now();

  const distanceKm = roadDistanceKm(donation.location, request.location);
  const dScore = distanceScore(distanceKm);
  const uScore = urgencyScore(request.urgency);
  const cScore = categoryScore(donation.category, request.category);
  const qScore = quantityScore(
    donation.quantity,
    Math.max(1, request.quantity - request.fulfilledQuantity),
  );
  const eScore = expiryScore(donation.expiryDate, now);

  let matchScore =
    weights.distance * dScore +
    weights.urgency * uScore +
    weights.category * cScore +
    weights.quantity * qScore +
    weights.expiry * eScore;

  // Hard guards: a category mismatch or an unusable-by-deadline donation is not a match.
  if (cScore === 0) matchScore = 0;
  if (!deadlineIsCompatible(donation, request)) matchScore *= 0.4;

  const rounded = Math.round(matchScore * 1000) / 1000;
  const partial = {
    matchScore: rounded,
    distanceScore: round(dScore),
    urgencyScore: round(uScore),
    categoryScore: round(cScore),
    quantityScore: round(qScore),
    expiryScore: round(eScore),
    distanceKm: Math.round(distanceKm * 10) / 10,
  };

  const { explanation, reasons } = explainMatch(partial, request.urgency);
  return { ...partial, explanation, reasons };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export interface RankedMatch extends MatchScoreBreakdown {
  donation: Donation;
  request: ResourceRequest;
}

export interface RankOptions extends ScoreOptions {
  /** Pairs below this score are discarded. Default 0.35. */
  threshold?: number;
  limit?: number;
}

/** Rank every viable request for one donation. */
export function rankRequestsForDonation(
  donation: Donation,
  requests: ResourceRequest[],
  options: RankOptions = {},
): RankedMatch[] {
  const threshold = options.threshold ?? 0.35;
  return requests
    .filter((r) => r.status === 'created' || r.status === 'searching' || r.status === 'matched')
    .map((request) => ({ ...scoreMatch(donation, request, options), donation, request }))
    .filter((m) => m.matchScore >= threshold)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, options.limit ?? 10);
}

/** Rank every viable donation for one request. */
export function rankDonationsForRequest(
  request: ResourceRequest,
  donations: Donation[],
  options: RankOptions = {},
): RankedMatch[] {
  const threshold = options.threshold ?? 0.35;
  const openStatuses = new Set(['created', 'matching', 'matched']);
  return donations
    .filter((d) => openStatuses.has(d.status))
    .map((donation) => ({ ...scoreMatch(donation, request, options), donation, request }))
    .filter((m) => m.matchScore >= threshold)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, options.limit ?? 10);
}

/** Best single pairing for a donation across all open requests. */
export function findBestMatch(
  donation: Donation,
  requests: ResourceRequest[],
  options: RankOptions = {},
): RankedMatch | null {
  return rankRequestsForDonation(donation, requests, options)[0] ?? null;
}

export function matchQuality(score: number): { label: string; tone: 'success' | 'warning' | 'muted' } {
  if (score >= 0.8) return { label: 'Excellent match', tone: 'success' };
  if (score >= 0.6) return { label: 'Strong match', tone: 'success' };
  if (score >= 0.45) return { label: 'Fair match', tone: 'warning' };
  return { label: 'Weak match', tone: 'muted' };
}

export const CATEGORY_LABEL_MAP = CATEGORY_LABELS;
