/**
 * DONUM — resource request lifecycle.
 * created → searching → matched → fulfilled → completed
 */
import type { ResourceRequest, RequestStatus, UserProfile } from '@/types';
import { createDoc, subscribeCollection, updateDocById, uid } from '@/services/db';
import { REQUEST_STATUS_LABEL } from '@/utils/labels';
import { previewMatchesForRequest } from '@/features/matching/matchService';
import { notify } from '@/features/notifications/notificationService';

export type NewRequestInput = Omit<
  ResourceRequest,
  | 'id'
  | 'requestorId'
  | 'requestorName'
  | 'requestorRole'
  | 'requestorVerification'
  | 'status'
  | 'timeline'
  | 'fulfilledQuantity'
  | 'matchedDonationIds'
  | 'createdAt'
  | 'updatedAt'
>;

export async function createRequest(
  requestor: UserProfile,
  input: NewRequestInput,
): Promise<ResourceRequest> {
  const t = Date.now();
  const request = await createDoc<ResourceRequest>('requests', {
    ...input,
    id: uid('req'),
    requestorId: requestor.id,
    requestorName: requestor.organizationName ?? requestor.name,
    requestorRole: requestor.role === 'ngo' ? 'ngo' : 'requestor',
    requestorVerification: requestor.verificationStatus,
    status: 'created',
    fulfilledQuantity: 0,
    matchedDonationIds: [],
    timeline: [{ status: 'created', label: REQUEST_STATUS_LABEL.created, at: t }],
    createdAt: t,
    updatedAt: t,
  });

  // Immediately search the open donation pool.
  void searchForRequest(request);
  return request;
}

/** Move a request into `searching` and surface the best available donations. */
export async function searchForRequest(request: ResourceRequest): Promise<void> {
  await updateDocById<ResourceRequest>('requests', request.id, {
    status: 'searching',
    timeline: [
      ...request.timeline,
      { status: 'searching', label: REQUEST_STATUS_LABEL.searching, at: Date.now() },
    ],
  });

  const candidates = await previewMatchesForRequest(request);
  if (!candidates.length) return;

  await notify({
    userId: request.requestorId,
    title: 'DONUM found possible matches',
    body: `${candidates.length} donation${candidates.length > 1 ? 's' : ''} could cover "${request.title}". Review them now.`,
    kind: 'match',
    link: `/app/requests/${request.id}`,
  });
}

export async function updateRequestStatus(
  request: ResourceRequest,
  status: RequestStatus,
  note?: string,
): Promise<void> {
  await updateDocById<ResourceRequest>('requests', request.id, {
    status,
    timeline: [
      ...request.timeline,
      { status, label: REQUEST_STATUS_LABEL[status], at: Date.now(), note },
    ],
  });
}

export async function cancelRequest(request: ResourceRequest, reason?: string): Promise<void> {
  await updateRequestStatus(request, 'cancelled', reason);
}

export function subscribeRequests(next: (requests: ResourceRequest[]) => void): () => void {
  return subscribeCollection<ResourceRequest>('requests', (all) =>
    next([...all].sort((a, b) => b.createdAt - a.createdAt)),
  );
}
