/**
 * DONUM — volunteer delivery tasks.
 * available → accepted → going_to_pickup → picked_up → out_for_delivery
 *           → delivered → completed
 */
import type { DeliveryTask, Donation, TaskStatus, UserProfile } from '@/types';
import { getDocById, subscribeCollection, updateDocById } from '@/services/db';
import { TASK_LIFECYCLE, TASK_STATUS_LABEL, DONATION_STATUS_LABEL } from '@/utils/labels';
import { notify } from '@/features/notifications/notificationService';
import { completeDonationFlow } from '@/features/donations/donationService';
import {
  assertTaskTransition,
  canTransitionDonation,
} from '@/features/donations/lifecycle';

/** Donation status mirrored from each volunteer task transition. */
const DONATION_STATUS_FOR_TASK: Partial<Record<TaskStatus, Donation['status']>> = {
  accepted: 'pickup_scheduled',
  picked_up: 'picked_up',
  delivered: 'delivered',
  completed: 'completed',
};

export async function acceptTask(task: DeliveryTask, volunteer: UserProfile): Promise<void> {
  await advanceTask(task, 'accepted', volunteer);
}

export function nextStatus(status: TaskStatus): TaskStatus | null {
  const i = TASK_LIFECYCLE.indexOf(status);
  return i >= 0 && i < TASK_LIFECYCLE.length - 1 ? TASK_LIFECYCLE[i + 1] : null;
}

/** Move a task forward and keep the donation, donor, NGO and volunteer in sync. */
export async function advanceTask(
  task: DeliveryTask,
  status: TaskStatus,
  volunteer: UserProfile,
): Promise<void> {
  // Volunteer deliveries are strictly linear (§19): a task cannot jump from
  // accepted straight to delivered, nor regress once handed over.
  assertTaskTransition(task.status, status);
  if (task.status === status) return; // idempotent re-tap of the same button

  await updateDocById<DeliveryTask>('tasks', task.id, {
    status,
    volunteerId: volunteer.id,
    volunteerName: volunteer.name,
    timeline: [
      ...task.timeline,
      { status, label: TASK_STATUS_LABEL[status], at: Date.now(), actor: volunteer.name },
    ],
  });

  const donation = await getDocById<Donation>('donations', task.donationId);
  const donationStatus = DONATION_STATUS_FOR_TASK[status];

  if (donation && donationStatus && donation.status !== donationStatus) {
    if (donationStatus === 'completed') {
      await completeDonationFlow(donation.id);
    } else if (canTransitionDonation(donation.status, donationStatus)) {
      await updateDocById<Donation>('donations', donation.id, {
        status: donationStatus,
        // Lets security rules scope donation writes to this one volunteer.
        assignedVolunteerId: volunteer.id,
        timeline: [
          ...donation.timeline,
          {
            status: donationStatus,
            label: DONATION_STATUS_LABEL[donationStatus],
            at: Date.now(),
            actor: volunteer.name,
          },
        ],
      });
    }
  }

  await notifyForTransition(task, status, volunteer, donation);
}

async function notifyForTransition(
  task: DeliveryTask,
  status: TaskStatus,
  volunteer: UserProfile,
  donation?: Donation,
) {
  const donorId = donation?.donorId;
  const receiverId = donation?.matchedReceiverId;

  const send = async (userId: string | undefined, title: string, body: string) => {
    if (!userId) return;
    await notify({
      userId,
      title,
      body,
      kind: 'delivery',
      link: `/app/tasks/${task.id}`,
      donationId: task.donationId,
    });
  };

  switch (status) {
    case 'accepted':
      await send(
        donorId,
        'Your pickup has been scheduled',
        `${volunteer.name} will collect "${task.title}" from ${task.pickup.address}.`,
      );
      await send(
        receiverId,
        'A volunteer is on the way',
        `${volunteer.name} accepted the delivery of "${task.title}".`,
      );
      break;
    case 'going_to_pickup':
      await send(donorId, 'Your volunteer is on the way', `${volunteer.name} is heading to the pickup point.`);
      break;
    case 'picked_up':
      await send(donorId, 'Your donation has been picked up', `${volunteer.name} collected "${task.title}".`);
      await send(receiverId, 'Your resource is on the way', `"${task.title}" has left the pickup point.`);
      break;
    case 'out_for_delivery':
      await send(receiverId, 'Out for delivery', `${volunteer.name} is ${task.distanceKm.toFixed(1)} km away.`);
      break;
    case 'delivered':
      await send(receiverId, 'Delivery completed', `"${task.title}" has arrived. Please confirm receipt.`);
      await send(donorId, 'Your donation was delivered', `"${task.title}" reached ${task.dropoff.name}.`);
      break;
    case 'completed':
      await send(donorId, 'Donation completed', 'Thank you for turning surplus into impact.');
      break;
    default:
      break;
  }
}

export function subscribeTasks(next: (tasks: DeliveryTask[]) => void): () => void {
  return subscribeCollection<DeliveryTask>('tasks', (all) =>
    next([...all].sort((a, b) => a.scheduledFor - b.scheduledFor)),
  );
}
