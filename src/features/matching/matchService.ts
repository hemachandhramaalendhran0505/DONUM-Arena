/**
 * DONUM — matching orchestration.
 *
 * Runs the scoring engine against live data, persists the resulting breakdown
 * to the `matches` collection, moves the donation/request through their
 * lifecycles and notifies everyone involved.
 */
import type { Donation, Match, ResourceRequest, MatchingWeights } from '@/types';
import { rankRequestsForDonation, rankDonationsForRequest, type RankedMatch } from './engine';
import { createDoc, listDocs, subscribeCollection, updateDocById, uid } from '@/services/db';
import { notify } from '@/features/notifications/notificationService';
import { DONATION_STATUS_LABEL, REQUEST_STATUS_LABEL } from '@/utils/labels';

export interface MatchContext {
  weights?: MatchingWeights;
  threshold?: number;
}

function matchFrom(ranked: RankedMatch, status: Match['status'] = 'proposed'): Match {
  const { donation, request, ...breakdown } = ranked;
  const t = Date.now();
  return {
    id: uid('match'),
    donationId: donation.id,
    requestId: request.id,
    donorId: donation.donorId,
    receiverId: request.requestorId,
    donationTitle: donation.title,
    requestTitle: request.title,
    donorName: donation.donorName,
    receiverName: request.requestorName,
    status,
    ...breakdown,
    createdAt: t,
    updatedAt: t,
  };
}

/** Preview candidate requests for a donation without writing anything. */
export async function previewMatchesForDonation(
  donation: Donation,
  ctx: MatchContext = {},
): Promise<RankedMatch[]> {
  const requests = await listDocs<ResourceRequest>('requests');
  return rankRequestsForDonation(donation, requests, ctx);
}

/** Preview candidate donations for a request. */
export async function previewMatchesForRequest(
  request: ResourceRequest,
  ctx: MatchContext = {},
): Promise<RankedMatch[]> {
  const donations = await listDocs<Donation>('donations');
  return rankDonationsForRequest(request, donations, ctx);
}

/**
 * Run matching for a freshly created donation: score every open request, store
 * the top candidates and promote the best one to `matched`.
 */
export async function runMatchingForDonation(
  donation: Donation,
  ctx: MatchContext = {},
): Promise<Match | null> {
  const ranked = await previewMatchesForDonation(donation, ctx);

  await updateDocById<Donation>('donations', donation.id, {
    status: 'matching',
    timeline: [
      ...donation.timeline,
      { status: 'matching', label: DONATION_STATUS_LABEL.matching, at: Date.now() },
    ],
  });

  if (!ranked.length) return null;

  // Persist the top candidates so NGOs can see alternatives, not just the winner.
  const stored = await Promise.all(
    ranked.slice(0, 3).map((r) => createDoc<Match>('matches', matchFrom(r))),
  );
  const best = stored[0];
  const top = ranked[0];

  await updateDocById<Donation>('donations', donation.id, {
    status: 'matched',
    matchId: best.id,
    matchedRequestId: best.requestId,
    matchedReceiverId: best.receiverId,
    matchedReceiverName: best.receiverName,
    matchScore: best.matchScore,
    timeline: [
      ...donation.timeline,
      { status: 'matching', label: DONATION_STATUS_LABEL.matching, at: Date.now() - 1 },
      {
        status: 'matched',
        label: DONATION_STATUS_LABEL.matched,
        at: Date.now(),
        note: best.explanation,
      },
    ],
  });

  await updateDocById<ResourceRequest>('requests', top.request.id, {
    status: 'matched',
    matchedDonationIds: [...top.request.matchedDonationIds, donation.id],
    timeline: [
      ...top.request.timeline,
      {
        status: 'matched',
        label: REQUEST_STATUS_LABEL.matched,
        at: Date.now(),
        note: `Matched with ${donation.donorName}`,
      },
    ],
  });

  await notify({
    userId: donation.donorId,
    title: 'Your donation has been matched',
    body: `${best.receiverName} needs ${top.request.quantity} ${top.request.unit}. ${best.explanation}`,
    kind: 'match',
    link: `/app/donations/${donation.id}`,
  });

  await notify({
    userId: best.receiverId,
    title: 'A new donation matches your request',
    body: `${donation.title} — ${donation.quantity} ${donation.unit}, ${best.distanceKm.toFixed(1)} km away.`,
    kind: 'match',
    link: `/app/requests/${top.request.id}`,
  });

  return best;
}

/** Manually pair a specific donation with a specific request (NGO "Request" action). */
export async function createManualMatch(
  donation: Donation,
  request: ResourceRequest,
  ctx: MatchContext = {},
): Promise<Match> {
  const ranked = rankDonationsForRequest(request, [donation], { ...ctx, threshold: 0 })[0];
  const match = await createDoc<Match>('matches', matchFrom(ranked, 'proposed'));

  await updateDocById<Donation>('donations', donation.id, {
    status: 'matched',
    matchId: match.id,
    matchedRequestId: request.id,
    matchedReceiverId: request.requestorId,
    matchedReceiverName: request.requestorName,
    matchScore: match.matchScore,
    timeline: [
      ...donation.timeline,
      {
        status: 'matched',
        label: DONATION_STATUS_LABEL.matched,
        at: Date.now(),
        note: `${request.requestorName} requested this donation.`,
      },
    ],
  });

  await notify({
    userId: donation.donorId,
    title: 'Your donation has been requested',
    body: `${request.requestorName} would like your "${donation.title}". ${match.explanation}`,
    kind: 'match',
    link: `/app/donations/${donation.id}`,
  });

  return match;
}

export async function updateMatchStatus(id: string, status: Match['status']): Promise<void> {
  await updateDocById<Match>('matches', id, { status });
}

export function subscribeMatches(next: (matches: Match[]) => void): () => void {
  return subscribeCollection<Match>('matches', (all) =>
    next([...all].sort((a, b) => b.matchScore - a.matchScore)),
  );
}
