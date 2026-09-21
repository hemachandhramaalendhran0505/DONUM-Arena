import type {
  DonationCategory,
  DonationCondition,
  DonationStatus,
  RequestStatus,
  TaskStatus,
  Urgency,
  UserRole,
  VehicleType,
  VerificationStatus,
} from '@/types';

export const ROLE_LABEL: Record<UserRole, string> = {
  donor: 'Donor',
  ngo: 'NGO',
  volunteer: 'Volunteer',
  requestor: 'Requestor',
};

export const CATEGORY_LABEL: Record<DonationCategory, string> = {
  food_items: 'Food Items',
  clothes: 'Clothes',
  groceries: 'Groceries',
  essentials: 'Essentials',
  animal_food: 'Animal Food',
  other: 'Other',
};

export const CATEGORY_EMOJI: Record<DonationCategory, string> = {
  food_items: '🍲',
  clothes: '🧥',
  groceries: '🛒',
  essentials: '🧼',
  animal_food: '🐾',
  other: '📦',
};

export const CONDITION_LABEL: Record<DonationCondition, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  usable: 'Usable',
  fresh: 'Fresh',
  cooked: 'Freshly cooked',
};

export const DONATION_STATUS_LABEL: Record<DonationStatus, string> = {
  created: 'Created',
  matching: 'Matching',
  matched: 'Matched',
  accepted: 'Accepted',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  rejected: 'Rejected',
};

/** The happy-path lifecycle, in order. */
export const DONATION_LIFECYCLE: DonationStatus[] = [
  'created',
  'matching',
  'matched',
  'accepted',
  'pickup_scheduled',
  'picked_up',
  'delivered',
  'completed',
];

export const FAILURE_STATUSES: DonationStatus[] = ['cancelled', 'expired', 'rejected'];

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  created: 'Created',
  searching: 'Searching',
  matched: 'Matched',
  fulfilled: 'Fulfilled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const REQUEST_LIFECYCLE: RequestStatus[] = [
  'created',
  'searching',
  'matched',
  'fulfilled',
  'completed',
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  available: 'Available',
  accepted: 'Accepted',
  going_to_pickup: 'Going to pickup',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
};

export const TASK_LIFECYCLE: TaskStatus[] = [
  'available',
  'accepted',
  'going_to_pickup',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'completed',
];

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  pending: 'Verification pending',
  verified: 'Verified',
  rejected: 'Verification rejected',
  not_required: 'Unverified',
};

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  walk: 'On foot',
  bicycle: 'Bicycle',
  two_wheeler: 'Two-wheeler',
  car: 'Car',
  van: 'Van',
  truck: 'Truck',
};

export const UNITS_BY_CATEGORY: Record<DonationCategory, string[]> = {
  food_items: ['meals', 'servings', 'packs', 'kg', 'trays'],
  clothes: ['items', 'bags', 'sets', 'cartons'],
  groceries: ['kits', 'kg', 'bags', 'packs'],
  essentials: ['kits', 'items', 'packs', 'boxes'],
  animal_food: ['kg', 'bags', 'packs'],
  other: ['items', 'boxes', 'units'],
};

type Tone = 'success' | 'warning' | 'danger' | 'primary' | 'muted';

export const DONATION_STATUS_TONE: Record<DonationStatus, Tone> = {
  created: 'muted',
  matching: 'primary',
  matched: 'primary',
  accepted: 'primary',
  pickup_scheduled: 'warning',
  picked_up: 'warning',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  expired: 'danger',
  rejected: 'danger',
};

export const REQUEST_STATUS_TONE: Record<RequestStatus, Tone> = {
  created: 'muted',
  searching: 'primary',
  matched: 'primary',
  fulfilled: 'success',
  completed: 'success',
  cancelled: 'danger',
};

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  available: 'primary',
  accepted: 'primary',
  going_to_pickup: 'warning',
  picked_up: 'warning',
  out_for_delivery: 'warning',
  delivered: 'success',
  completed: 'success',
};

export const URGENCY_TONE: Record<Urgency, Tone> = {
  low: 'muted',
  medium: 'primary',
  high: 'warning',
  critical: 'danger',
};

export const VERIFICATION_TONE: Record<VerificationStatus, Tone> = {
  verified: 'success',
  pending: 'warning',
  rejected: 'danger',
  not_required: 'muted',
};
