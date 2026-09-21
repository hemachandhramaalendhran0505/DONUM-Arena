/**
 * DONUM — donation lifecycle.
 *
 * created → matching → matched → accepted → pickup_scheduled → picked_up
 *         → delivered → completed   (failures: cancelled / expired / rejected)
 */
import type {
  DeliveryTask,
  Donation,
  DonationStatus,
  ResourceRequest,
  StatusEvent,
  UserProfile,
} from '@/types';
import { createDoc, getDocById, subscribeCollection, updateDocById, uid } from './db';
import { notify } from './notificationService';
import { runMatchingForDonation } from './matchService';
import { DONATION_STATUS_LABEL, REQUEST_STATUS_LABEL, TASK_STATUS_LABEL } from '@/utils/labels';
import { estimateMinutes, roadDistanceKm } from '@/utils/geo';

export type NewDonationInput = Omit<
  Donation,
  | 'id'
  | 'donorId'
  | 'donorName'
  | 'donorVerification'
  | 'status'
  | 'timeline'
  | 'createdAt'
  | 'updatedAt'
>;

function appendEvent(donation: Donation, status: DonationStatus, note?: string): StatusEvent[] {
  return [
    ...donation.timeline,
    { status, label: DONATION_STATUS_LABEL[status], at: Date.now(), note },
  ];
}

export async function createDonation(
  donor: UserProfile,
  input: NewDonationInput,
): Promise<Donation> {
  const t = Date.now();
  const donation = await createDoc<Donation>('donations', {
    ...input,
    id: uid('don'),
    donorId: donor.id,
    donorName: donor.name,
    donorPhone: donor.phone,
    donorVerification: donor.verificationStatus,
    status: 'created',
    timeline: [{ status: 'created', label: DONATION_STATUS_LABEL.created, at: t }],
    createdAt: t,
    updatedAt: t,
  });

  // Kick off intelligent matching immediately — this is the heart of DONUM.
  void runMatchingForDonation(donation);
  return donation;
}

export async function updateDonationStatus(
  donation: Donation,
  status: DonationStatus,
  note?: string,
): Promise<void> {
  await updateDocById<Donation>('donations', donation.id, {
    status,
    timeline: appendEvent(donation, status, note),
  });
}

/** NGO accepts a matched donation; a delivery task is created when transport is needed. */
export async function acceptDonation(
  donation: Donation,
  receiver: UserProfile,
): Promise<DeliveryTask | null> {
  await updateDocById<Donation>('donations', donation.id, {
    status: 'accepted',
    matchedReceiverId: receiver.id,
    matchedReceiverName: receiver.organizationName ?? receiver.name,
    timeline: appendEvent(donation, 'accepted', `Accepted by ${receiver.organizationName ?? receiver.name}`),
  });

  await notify({
    userId: donation.donorId,
    title: 'Your donation was accepted',
    body: `${receiver.organizationName ?? receiver.name} accepted "${donation.title}".`,
    kind: 'match',
    link: `/app/donations/${donation.id}`,
  });

  if (!donation.needsVolunteer) return null;
  return createDeliveryTask(donation, receiver);
}

export async function rejectDonation(donation: Donation, reason?: string): Promise<void> {
  await updateDocById<Donation>('donations', donation.id, {
    status: 'rejected',
    matchId: undefined,
    matchedReceiverId: undefined,
    matchedReceiverName: undefined,
    timeline: appendEvent(donation, 'rejected', reason),
  });
  await notify({
    userId: donation.donorId,
    title: 'A match was declined',
    body: `"${donation.title}" was declined${reason ? `: ${reason}` : ''}. DONUM is searching for another receiver.`,
    kind: 'match',
    link: `/app/donations/${donation.id}`,
  });
}

export async function cancelDonation(donation: Donation, reason?: string): Promise<void> {
  await updateDonationStatus(donation, 'cancelled', reason);
}

/** Create the volunteer pickup → delivery task for an accepted donation. */
export async function createDeliveryTask(
  donation: Donation,
  receiver: UserProfile,
): Promise<DeliveryTask> {
  const dropoff = {
    name: receiver.organizationName ?? receiver.name,
    address: receiver.location,
    latitude: receiver.latitude,
    longitude: receiver.longitude,
    contactName: receiver.name,
    contactPhone: receiver.phone,
  };
  const distanceKm = roadDistanceKm(donation.location, dropoff);
  const t = Date.now();

  const task = await createDoc<DeliveryTask>('tasks', {
    id: uid('task'),
    donationId: donation.id,
    matchId: donation.matchId,
    requestId: donation.matchedRequestId,
    title: donation.title,
    category: donation.category,
    quantity: donation.quantity,
    unit: donation.unit,
    pickup: {
      name: donation.donorName,
      address: donation.location.address,
      latitude: donation.location.latitude,
      longitude: donation.location.longitude,
      contactName: donation.donorName,
      contactPhone: donation.donorPhone,
    },
    dropoff,
    distanceKm,
    estimatedMinutes: estimateMinutes(distanceKm),
    pickupWindow: donation.pickupTime,
    scheduledFor: donation.pickupDate,
    status: 'available',
    timeline: [{ status: 'available', label: TASK_STATUS_LABEL.available, at: t }],
    createdAt: t,
    updatedAt: t,
  });

  await updateDocById<Donation>('donations', donation.id, { taskId: task.id });
  return task;
}

/** Called when a delivery completes: closes the donation and credits the request. */
export async function completeDonationFlow(donationId: string): Promise<void> {
  const donation = await getDocById<Donation>('donations', donationId);
  if (!donation) return;

  await updateDocById<Donation>('donations', donation.id, {
    status: 'completed',
    peopleHelped: donation.peopleHelped ?? Math.round(donation.quantity * 1.2),
    timeline: appendEvent(donation, 'completed', 'Donation completed. Thank you!'),
  });

  await notify({
    userId: donation.donorId,
    title: 'Your donation was successfully delivered',
    body: `"${donation.title}" reached the people who needed it. Thank you for turning surplus into impact.`,
    kind: 'delivery',
    link: `/app/donations/${donation.id}`,
  });

  if (!donation.matchedRequestId) return;
  const request = await getDocById<ResourceRequest>('requests', donation.matchedRequestId);
  if (!request) return;

  const fulfilled = Math.min(request.quantity, request.fulfilledQuantity + donation.quantity);
  const complete = fulfilled >= request.quantity;

  await updateDocById<ResourceRequest>('requests', request.id, {
    fulfilledQuantity: fulfilled,
    status: complete ? 'completed' : 'fulfilled',
    timeline: [
      ...request.timeline,
      {
        status: complete ? 'completed' : 'fulfilled',
        label: complete ? REQUEST_STATUS_LABEL.completed : REQUEST_STATUS_LABEL.fulfilled,
        at: Date.now(),
        note: `${donation.quantity} ${donation.unit} received from ${donation.donorName}`,
      },
    ],
  });

  await notify({
    userId: request.requestorId,
    title: complete ? 'Your request has been fulfilled' : 'Your request received a delivery',
    body: `${donation.quantity} ${donation.unit} from ${donation.donorName} have been delivered.`,
    kind: 'request',
    link: `/app/requests/${request.id}`,
  });
}

export function subscribeDonations(next: (donations: Donation[]) => void): () => void {
  return subscribeCollection<Donation>('donations', (all) =>
    next([...all].sort((a, b) => b.createdAt - a.createdAt)),
  );
}

/** Auto-expire donations whose expiry has passed while they were still open. */
export function expireStaleDonations(donations: Donation[]): void {
  const now = Date.now();
  const open = new Set<DonationStatus>(['created', 'matching', 'matched']);
  donations
    .filter((d) => d.expiryDate && d.expiryDate < now && open.has(d.status))
    .forEach((d) => {
      void updateDocById<Donation>('donations', d.id, {
        status: 'expired',
        timeline: appendEvent(d, 'expired', 'Passed its expiry window before being collected.'),
      });
    });
}
