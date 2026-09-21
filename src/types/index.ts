/**
 * DONUM — shared domain types.
 * "DONUM connects surplus to scarcity."
 */

export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'requestor';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'not_required';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationInfo extends GeoPoint {
  address: string;
  city?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  profileImage?: string;
  /** Human readable address */
  location: string;
  city?: string;
  latitude: number;
  longitude: number;
  verificationStatus: VerificationStatus;
  bio?: string;

  /** NGO specific */
  organizationName?: string;
  registrationNumber?: string;
  fssaiLicense?: string;
  focusAreas?: DonationCategory[];
  beneficiariesServed?: number;

  /** Volunteer specific */
  vehicleType?: VehicleType;
  availability?: string;
  idProofNumber?: string;

  /** Requestor specific */
  householdSize?: number;

  onboardingComplete?: boolean;
  locationPermission?: boolean;
  /**
   * FCM registration tokens, one per device/browser the user has enabled push
   * on. Stored as an array so a user signed in on phone and laptop receives
   * notifications on both; stale tokens are pruned on send failure.
   */
  fcmTokens?: string[];
  createdAt: number;
  updatedAt: number;
}

export type VehicleType = 'walk' | 'bicycle' | 'two_wheeler' | 'car' | 'van' | 'truck';

export type DonationCategory =
  | 'food_items'
  | 'clothes'
  | 'groceries'
  | 'essentials'
  | 'animal_food'
  | 'other';

export type DonationCondition = 'new' | 'like_new' | 'good' | 'usable' | 'fresh' | 'cooked';

export type DonationStatus =
  | 'created'
  | 'matching'
  | 'matched'
  | 'accepted'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'rejected';

export type RequestStatus =
  | 'created'
  | 'searching'
  | 'matched'
  | 'fulfilled'
  | 'completed'
  | 'cancelled';

export type TaskStatus =
  | 'available'
  | 'accepted'
  | 'going_to_pickup'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed';

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export type MatchStatus = 'proposed' | 'accepted' | 'rejected' | 'expired' | 'fulfilled';

export interface StatusEvent {
  status: string;
  label: string;
  at: number;
  note?: string;
  actor?: string;
}

export interface FoodDetails {
  foodType?: 'cooked' | 'raw' | 'packaged' | 'bakery' | 'dairy' | 'beverage';
  preparationDate?: number;
  storageRequirement?: 'ambient' | 'refrigerated' | 'frozen' | 'hot';
  dietary?: 'vegetarian' | 'non_vegetarian' | 'vegan' | 'mixed';
  estimatedServings?: number;
  allergens?: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorPhone?: string;
  donorVerification: VerificationStatus;
  title: string;
  category: DonationCategory;
  description: string;
  quantity: number;
  unit: string;
  condition: DonationCondition;
  /** epoch ms */
  expiryDate?: number;
  pickupDate: number;
  pickupTime: string;
  location: LocationInfo;
  images: string[];
  specialInstructions?: string;
  foodDetails?: FoodDetails;
  status: DonationStatus;
  timeline: StatusEvent[];
  matchId?: string;
  matchedRequestId?: string;
  matchedReceiverId?: string;
  matchedReceiverName?: string;
  matchScore?: number;
  taskId?: string;
  needsVolunteer?: boolean;
  peopleHelped?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ResourceRequest {
  id: string;
  requestorId: string;
  requestorName: string;
  requestorRole: Extract<UserRole, 'ngo' | 'requestor'>;
  requestorVerification: VerificationStatus;
  title: string;
  category: DonationCategory;
  quantity: number;
  unit: string;
  urgency: Urgency;
  /** epoch ms */
  requiredBy: number;
  location: LocationInfo;
  description: string;
  beneficiaryCount: number;
  status: RequestStatus;
  timeline: StatusEvent[];
  fulfilledQuantity: number;
  matchedDonationIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MatchScoreBreakdown {
  matchScore: number;
  distanceScore: number;
  urgencyScore: number;
  categoryScore: number;
  quantityScore: number;
  expiryScore: number;
  distanceKm: number;
  explanation: string;
  reasons: string[];
}

export interface Match extends MatchScoreBreakdown {
  id: string;
  donationId: string;
  requestId: string;
  donorId: string;
  receiverId: string;
  donationTitle: string;
  requestTitle: string;
  receiverName: string;
  donorName: string;
  status: MatchStatus;
  createdAt: number;
  updatedAt: number;
}

export interface DeliveryStop {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contactName?: string;
  contactPhone?: string;
}

export interface DeliveryTask {
  id: string;
  donationId: string;
  matchId?: string;
  requestId?: string;
  title: string;
  category: DonationCategory;
  quantity: number;
  unit: string;
  pickup: DeliveryStop;
  dropoff: DeliveryStop;
  distanceKm: number;
  estimatedMinutes: number;
  pickupWindow: string;
  scheduledFor: number;
  status: TaskStatus;
  volunteerId?: string;
  volunteerName?: string;
  timeline: StatusEvent[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type NotificationKind =
  | 'match'
  | 'pickup'
  | 'delivery'
  | 'request'
  | 'verification'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: NotificationKind;
  read: boolean;
  link?: string;
  createdAt: number;
}

export interface ImpactSummary {
  totalDonations: number;
  successfulDonations: number;
  peopleReached: number;
  resourcesDistributed: number;
  volunteerHours: number;
  distanceSavedKm: number;
  wasteDivertedKg: number;
  activeDonations: number;
  pendingPickups: number;
  completionRate: number;
}

export interface CategoryBucket {
  category: DonationCategory;
  count: number;
  quantity: number;
}

export interface TimeBucket {
  label: string;
  date: number;
  donations: number;
  completed: number;
}

export interface LocationBucket {
  city: string;
  count: number;
  peopleReached: number;
}

export interface MatchingWeights {
  distance: number;
  urgency: number;
  category: number;
  quantity: number;
  expiry: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpPayload extends Credentials {
  name: string;
  role: UserRole;
  phone?: string;
}
