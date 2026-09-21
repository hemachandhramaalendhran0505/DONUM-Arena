/**
 * DONUM — demo seed data.
 *
 * A realistic, internally-consistent city network (Bengaluru) so every screen,
 * chart, map and matching result has meaningful data on first run.
 */
import type {
  AppNotification,
  DeliveryTask,
  Donation,
  Match,
  ResourceRequest,
  StatusEvent,
  UserProfile,
} from '@/types';
import { DONATION_STATUS_LABEL, REQUEST_STATUS_LABEL, TASK_STATUS_LABEL } from '@/utils/labels';
import { roadDistanceKm, estimateMinutes } from '@/utils/geo';
import { scoreMatch } from '@/features/matching/engine';

const HOUR = 36e5;
const DAY = 24 * HOUR;
const now = () => Date.now();

export interface StoredCredential {
  id: string;
  email: string;
  password: string;
  userId: string;
}

function event(status: string, label: string, at: number, note?: string): StatusEvent {
  return { status, label, at, note };
}

function donationTimeline(statuses: Donation['status'][], start: number): StatusEvent[] {
  return statuses.map((status, i) =>
    event(status, DONATION_STATUS_LABEL[status], start + i * 2.5 * HOUR),
  );
}

export function buildSeed() {
  const t = now();

  const users: UserProfile[] = [
    {
      id: 'user_donor_demo',
      name: 'Aarav Mehta',
      email: 'donor@donum.app',
      phone: '+91 98450 11223',
      role: 'donor',
      location: 'Indiranagar, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9784,
      longitude: 77.6408,
      verificationStatus: 'verified',
      bio: 'Runs Spice Route Kitchen. Redirects surplus catering food every evening.',
      onboardingComplete: true,
      locationPermission: true,
      createdAt: t - 120 * DAY,
      updatedAt: t - 2 * DAY,
    },
    {
      id: 'user_ngo_demo',
      name: 'Priya Nair',
      email: 'ngo@donum.app',
      phone: '+91 99000 44556',
      role: 'ngo',
      organizationName: 'Anna Seva Foundation',
      registrationNumber: 'KA/2019/0098765',
      fssaiLicense: '11223344556677',
      focusAreas: ['food_items', 'groceries'],
      beneficiariesServed: 18400,
      location: 'Shivajinagar, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9856,
      longitude: 77.6047,
      verificationStatus: 'verified',
      bio: 'Serves hot meals to 400+ people daily across three shelters.',
      onboardingComplete: true,
      locationPermission: true,
      createdAt: t - 300 * DAY,
      updatedAt: t - 5 * DAY,
    },
    {
      id: 'user_volunteer_demo',
      name: 'Rohit Sharma',
      email: 'volunteer@donum.app',
      phone: '+91 97400 77889',
      role: 'volunteer',
      vehicleType: 'two_wheeler',
      availability: 'Weekday evenings, 6pm – 10pm',
      idProofNumber: 'DL-KA0320190001',
      location: 'Domlur, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9606,
      longitude: 77.638,
      verificationStatus: 'verified',
      bio: '124 deliveries completed. Knows every shortcut in east Bengaluru.',
      onboardingComplete: true,
      locationPermission: true,
      createdAt: t - 200 * DAY,
      updatedAt: t - DAY,
    },
    {
      id: 'user_requestor_demo',
      name: 'Lakshmi Devi',
      email: 'requestor@donum.app',
      phone: '+91 96320 33445',
      role: 'requestor',
      householdSize: 34,
      location: 'Ejipura, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9401,
      longitude: 77.6256,
      verificationStatus: 'verified',
      bio: 'Coordinates for 34 families in the Ejipura settlement.',
      onboardingComplete: true,
      locationPermission: true,
      createdAt: t - 60 * DAY,
      updatedAt: t - 3 * DAY,
    },
    {
      id: 'user_ngo_2',
      name: 'Imran Qureshi',
      email: 'hope@donum.app',
      phone: '+91 98800 22110',
      role: 'ngo',
      organizationName: 'Hope Shelter Trust',
      registrationNumber: 'KA/2016/0054321',
      focusAreas: ['clothes', 'essentials'],
      beneficiariesServed: 7200,
      location: 'Jayanagar, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9299,
      longitude: 77.5826,
      verificationStatus: 'verified',
      createdAt: t - 400 * DAY,
      updatedAt: t - 20 * DAY,
      onboardingComplete: true,
    },
    {
      id: 'user_ngo_3',
      name: 'Sneha Rao',
      email: 'paws@donum.app',
      phone: '+91 91080 65432',
      role: 'ngo',
      organizationName: 'Paws & Claws Rescue',
      registrationNumber: 'KA/2021/0011223',
      focusAreas: ['animal_food'],
      beneficiariesServed: 1500,
      location: 'Koramangala, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      verificationStatus: 'pending',
      createdAt: t - 40 * DAY,
      updatedAt: t - 4 * DAY,
      onboardingComplete: true,
    },
    {
      id: 'user_donor_2',
      name: 'Grand Vista Hotel',
      email: 'grandvista@donum.app',
      phone: '+91 80416 00000',
      role: 'donor',
      location: 'MG Road, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9752,
      longitude: 77.6063,
      verificationStatus: 'verified',
      createdAt: t - 250 * DAY,
      updatedAt: t - 6 * DAY,
      onboardingComplete: true,
    },
    {
      id: 'user_donor_3',
      name: 'Meera Krishnan',
      email: 'meera@donum.app',
      phone: '+91 99640 12345',
      role: 'donor',
      location: 'Whitefield, Bengaluru',
      city: 'Bengaluru',
      latitude: 12.9698,
      longitude: 77.7499,
      verificationStatus: 'pending',
      createdAt: t - 15 * DAY,
      updatedAt: t - DAY,
      onboardingComplete: true,
    },
  ];

  const credentials: StoredCredential[] = users
    .filter((u) => u.email.endsWith('@donum.app'))
    .map((u) => ({ id: `cred_${u.id}`, email: u.email, password: 'donum123', userId: u.id }));

  const donations: Donation[] = [
    {
      id: 'don_1001',
      donorId: 'user_donor_demo',
      donorName: 'Aarav Mehta',
      donorPhone: '+91 98450 11223',
      donorVerification: 'verified',
      title: 'Surplus wedding catering — rice, dal & curry',
      category: 'food_items',
      description:
        'Freshly cooked vegetarian buffet surplus from a 300-guest reception. Packed in insulated catering trays, never served on the buffet line.',
      quantity: 120,
      unit: 'meals',
      condition: 'cooked',
      expiryDate: t + 9 * HOUR,
      pickupDate: t + 2 * HOUR,
      pickupTime: '20:00 – 21:30',
      location: {
        latitude: 12.9784,
        longitude: 77.6408,
        address: 'Spice Route Kitchen, 100 Feet Road, Indiranagar',
        city: 'Bengaluru',
      },
      images: [],
      specialInstructions: 'Use the service entrance at the rear. Ask for Aarav at the kitchen desk.',
      foodDetails: {
        foodType: 'cooked',
        preparationDate: t - 3 * HOUR,
        storageRequirement: 'hot',
        dietary: 'vegetarian',
        estimatedServings: 120,
        allergens: 'Contains dairy and nuts',
      },
      status: 'matched',
      needsVolunteer: true,
      timeline: donationTimeline(['created', 'matching', 'matched'], t - 5 * HOUR),
      createdAt: t - 5 * HOUR,
      updatedAt: t - 40 * 60000,
    },
    {
      id: 'don_1002',
      donorId: 'user_donor_demo',
      donorName: 'Aarav Mehta',
      donorPhone: '+91 98450 11223',
      donorVerification: 'verified',
      title: 'Winter clothing — jackets, sweaters & blankets',
      category: 'clothes',
      description:
        'Gently used winter wear collected from an apartment drive. Washed, sorted by size and packed into 4 labelled cartons.',
      quantity: 85,
      unit: 'items',
      condition: 'good',
      pickupDate: t + DAY,
      pickupTime: '10:00 – 13:00',
      location: {
        latitude: 12.9768,
        longitude: 77.6395,
        address: 'Palm Grove Apartments, Indiranagar 1st Stage',
        city: 'Bengaluru',
      },
      images: [],
      status: 'pickup_scheduled',
      needsVolunteer: true,
      timeline: donationTimeline(
        ['created', 'matching', 'matched', 'accepted', 'pickup_scheduled'],
        t - 2 * DAY,
      ),
      createdAt: t - 2 * DAY,
      updatedAt: t - 3 * HOUR,
      peopleHelped: 85,
    },
    {
      id: 'don_1003',
      donorId: 'user_donor_demo',
      donorName: 'Aarav Mehta',
      donorPhone: '+91 98450 11223',
      donorVerification: 'verified',
      title: 'Monthly grocery kits — rice, oil, pulses',
      category: 'groceries',
      description: '25 family ration kits. Each kit: 5kg rice, 1L oil, 2kg dal, spices, tea.',
      quantity: 25,
      unit: 'kits',
      condition: 'new',
      expiryDate: t + 180 * DAY,
      pickupDate: t - 6 * DAY,
      pickupTime: '11:00 – 14:00',
      location: {
        latitude: 12.9784,
        longitude: 77.6408,
        address: 'Spice Route Kitchen, 100 Feet Road, Indiranagar',
        city: 'Bengaluru',
      },
      images: [],
      status: 'completed',
      timeline: donationTimeline(
        ['created', 'matching', 'matched', 'accepted', 'pickup_scheduled', 'picked_up', 'delivered', 'completed'],
        t - 9 * DAY,
      ),
      matchedReceiverId: 'user_requestor_demo',
      matchedReceiverName: 'Lakshmi Devi',
      peopleHelped: 112,
      createdAt: t - 9 * DAY,
      updatedAt: t - 5 * DAY,
    },
    {
      id: 'don_1004',
      donorId: 'user_donor_demo',
      donorName: 'Aarav Mehta',
      donorPhone: '+91 98450 11223',
      donorVerification: 'verified',
      title: 'Bakery surplus — breads and buns',
      category: 'food_items',
      description: 'End-of-day artisan breads, croissants and buns from the in-house bakery.',
      quantity: 60,
      unit: 'packs',
      condition: 'fresh',
      expiryDate: t + 20 * HOUR,
      pickupDate: t + 4 * HOUR,
      pickupTime: '21:00 – 22:00',
      location: {
        latitude: 12.979,
        longitude: 77.642,
        address: 'Spice Route Bakery, CMH Road, Indiranagar',
        city: 'Bengaluru',
      },
      images: [],
      foodDetails: {
        foodType: 'bakery',
        preparationDate: t - 8 * HOUR,
        storageRequirement: 'ambient',
        dietary: 'vegetarian',
        estimatedServings: 60,
      },
      status: 'created',
      timeline: donationTimeline(['created'], t - 30 * 60000),
      createdAt: t - 30 * 60000,
      updatedAt: t - 30 * 60000,
    },
    {
      id: 'don_2001',
      donorId: 'user_donor_2',
      donorName: 'Grand Vista Hotel',
      donorPhone: '+91 80416 00000',
      donorVerification: 'verified',
      title: 'Banquet surplus — biryani & gravy (non-veg)',
      category: 'food_items',
      description: 'Untouched banquet trays from a corporate event. Chicken biryani and curry.',
      quantity: 90,
      unit: 'meals',
      condition: 'cooked',
      expiryDate: t + 7 * HOUR,
      pickupDate: t + HOUR,
      pickupTime: '19:30 – 20:30',
      location: {
        latitude: 12.9752,
        longitude: 77.6063,
        address: 'Grand Vista Hotel, MG Road',
        city: 'Bengaluru',
      },
      images: [],
      foodDetails: {
        foodType: 'cooked',
        preparationDate: t - 4 * HOUR,
        storageRequirement: 'hot',
        dietary: 'non_vegetarian',
        estimatedServings: 90,
      },
      status: 'created',
      needsVolunteer: true,
      timeline: donationTimeline(['created'], t - 2 * HOUR),
      createdAt: t - 2 * HOUR,
      updatedAt: t - 2 * HOUR,
    },
    {
      id: 'don_2002',
      donorId: 'user_donor_3',
      donorName: 'Meera Krishnan',
      donorPhone: '+91 99640 12345',
      donorVerification: 'pending',
      title: 'Pet food — dry kibble and cat food',
      category: 'animal_food',
      description: 'Sealed bags of dog kibble (15kg) and cat food (6kg) from a closed pet store.',
      quantity: 21,
      unit: 'kg',
      condition: 'new',
      expiryDate: t + 120 * DAY,
      pickupDate: t + 2 * DAY,
      pickupTime: '15:00 – 18:00',
      location: {
        latitude: 12.9698,
        longitude: 77.7499,
        address: 'Palm Meadows, Whitefield',
        city: 'Bengaluru',
      },
      images: [],
      status: 'created',
      timeline: donationTimeline(['created'], t - 20 * HOUR),
      createdAt: t - 20 * HOUR,
      updatedAt: t - 20 * HOUR,
    },
    {
      id: 'don_2003',
      donorId: 'user_donor_2',
      donorName: 'Grand Vista Hotel',
      donorPhone: '+91 80416 00000',
      donorVerification: 'verified',
      title: 'Hygiene essentials — soap, sanitary kits, toothpaste',
      category: 'essentials',
      description: '150 hotel-grade hygiene kits, individually sealed.',
      quantity: 150,
      unit: 'kits',
      condition: 'new',
      pickupDate: t + 3 * DAY,
      pickupTime: '09:00 – 12:00',
      location: {
        latitude: 12.9752,
        longitude: 77.6063,
        address: 'Grand Vista Hotel, MG Road',
        city: 'Bengaluru',
      },
      images: [],
      status: 'created',
      timeline: donationTimeline(['created'], t - 30 * HOUR),
      createdAt: t - 30 * HOUR,
      updatedAt: t - 30 * HOUR,
    },
    {
      id: 'don_2004',
      donorId: 'user_donor_2',
      donorName: 'Grand Vista Hotel',
      donorPhone: '+91 80416 00000',
      donorVerification: 'verified',
      title: 'Bulk vegetables — onions, potatoes, tomatoes',
      category: 'groceries',
      description: 'Over-ordered fresh produce from the hotel cold room. Sorted and crated.',
      quantity: 180,
      unit: 'kg',
      condition: 'fresh',
      expiryDate: t + 4 * DAY,
      pickupDate: t + 18 * HOUR,
      pickupTime: '07:00 – 10:00',
      location: {
        latitude: 12.9745,
        longitude: 77.6072,
        address: 'Grand Vista Hotel — Loading Bay, MG Road',
        city: 'Bengaluru',
      },
      images: [],
      status: 'created',
      needsVolunteer: true,
      timeline: donationTimeline(['created'], t - 10 * HOUR),
      createdAt: t - 10 * HOUR,
      updatedAt: t - 10 * HOUR,
    },
    {
      id: 'don_2005',
      donorId: 'user_donor_3',
      donorName: 'Meera Krishnan',
      donorPhone: '+91 99640 12345',
      donorVerification: 'pending',
      title: "Children's clothes & school uniforms",
      category: 'clothes',
      description: 'Outgrown uniforms and play clothes, ages 4–12. Freshly laundered.',
      quantity: 64,
      unit: 'items',
      condition: 'like_new',
      pickupDate: t + 26 * HOUR,
      pickupTime: '16:00 – 19:00',
      location: {
        latitude: 12.9698,
        longitude: 77.7499,
        address: 'Palm Meadows, Whitefield',
        city: 'Bengaluru',
      },
      images: [],
      status: 'created',
      timeline: donationTimeline(['created'], t - 26 * HOUR),
      createdAt: t - 26 * HOUR,
      updatedAt: t - 26 * HOUR,
    },
  ];

  // Historical completed donations power the impact charts.
  const historyCategories = ['food_items', 'clothes', 'groceries', 'essentials', 'animal_food'] as const;
  for (let i = 0; i < 24; i += 1) {
    const created = t - (7 + i * 3) * DAY;
    const category = historyCategories[i % historyCategories.length];
    const quantity = [40, 25, 18, 60, 12][i % 5] + (i % 7) * 3;
    donations.push({
      id: `don_hist_${i}`,
      donorId: i % 3 === 0 ? 'user_donor_demo' : i % 3 === 1 ? 'user_donor_2' : 'user_donor_3',
      donorName: i % 3 === 0 ? 'Aarav Mehta' : i % 3 === 1 ? 'Grand Vista Hotel' : 'Meera Krishnan',
      donorVerification: 'verified',
      title: `Completed ${category.replace('_', ' ')} donation #${i + 1}`,
      category,
      description: 'Archived donation used for impact analytics.',
      quantity,
      unit: category === 'food_items' ? 'meals' : category === 'groceries' ? 'kg' : 'items',
      condition: 'good',
      pickupDate: created + DAY,
      pickupTime: '10:00 – 12:00',
      location: {
        latitude: 12.95 + (i % 6) * 0.012,
        longitude: 77.58 + (i % 5) * 0.016,
        address: ['Indiranagar', 'Jayanagar', 'Koramangala', 'Whitefield', 'Shivajinagar'][i % 5],
        city: 'Bengaluru',
      },
      images: [],
      status: i % 9 === 8 ? 'cancelled' : 'completed',
      timeline: donationTimeline(['created', 'matching', 'matched', 'completed'], created),
      peopleHelped: Math.round(quantity * 1.4),
      matchedReceiverId: i % 2 === 0 ? 'user_ngo_demo' : 'user_ngo_2',
      matchedReceiverName: i % 2 === 0 ? 'Anna Seva Foundation' : 'Hope Shelter Trust',
      createdAt: created,
      updatedAt: created + 2 * DAY,
    });
  }

  const requests: ResourceRequest[] = [
    {
      id: 'req_3001',
      requestorId: 'user_ngo_demo',
      requestorName: 'Anna Seva Foundation',
      requestorRole: 'ngo',
      requestorVerification: 'verified',
      title: 'Hot dinner for night shelter — 150 people',
      category: 'food_items',
      quantity: 150,
      unit: 'meals',
      urgency: 'critical',
      requiredBy: t + 6 * HOUR,
      location: {
        latitude: 12.9856,
        longitude: 77.6047,
        address: 'Anna Seva Night Shelter, Shivajinagar',
        city: 'Bengaluru',
      },
      description:
        'Our regular supplier cancelled. We need hot vegetarian dinner for 150 residents tonight.',
      beneficiaryCount: 150,
      status: 'matched',
      fulfilledQuantity: 0,
      matchedDonationIds: ['don_1001'],
      timeline: [
        event('created', REQUEST_STATUS_LABEL.created, t - 6 * HOUR),
        event('searching', REQUEST_STATUS_LABEL.searching, t - 5.5 * HOUR),
        event('matched', REQUEST_STATUS_LABEL.matched, t - 40 * 60000, 'Matched with Spice Route Kitchen'),
      ],
      createdAt: t - 6 * HOUR,
      updatedAt: t - 40 * 60000,
    },
    {
      id: 'req_3002',
      requestorId: 'user_requestor_demo',
      requestorName: 'Lakshmi Devi',
      requestorRole: 'requestor',
      requestorVerification: 'verified',
      title: 'Monthly rations for 34 families',
      category: 'groceries',
      quantity: 34,
      unit: 'kits',
      urgency: 'high',
      requiredBy: t + 5 * DAY,
      location: {
        latitude: 12.9401,
        longitude: 77.6256,
        address: 'Ejipura Settlement, Block C',
        city: 'Bengaluru',
      },
      description:
        'Daily-wage families whose work stopped during the monsoon. Rice, oil and pulses needed most.',
      beneficiaryCount: 142,
      status: 'searching',
      fulfilledQuantity: 8,
      matchedDonationIds: [],
      timeline: [
        event('created', REQUEST_STATUS_LABEL.created, t - 2 * DAY),
        event('searching', REQUEST_STATUS_LABEL.searching, t - 2 * DAY + HOUR),
      ],
      createdAt: t - 2 * DAY,
      updatedAt: t - 20 * HOUR,
    },
    {
      id: 'req_3003',
      requestorId: 'user_ngo_2',
      requestorName: 'Hope Shelter Trust',
      requestorRole: 'ngo',
      requestorVerification: 'verified',
      title: 'Warm clothing for 80 shelter residents',
      category: 'clothes',
      quantity: 80,
      unit: 'items',
      urgency: 'medium',
      requiredBy: t + 9 * DAY,
      location: {
        latitude: 12.9299,
        longitude: 77.5826,
        address: 'Hope Shelter, 9th Block Jayanagar',
        city: 'Bengaluru',
      },
      description: 'Temperatures are dropping at night. Jackets, sweaters and blankets needed.',
      beneficiaryCount: 80,
      status: 'matched',
      fulfilledQuantity: 0,
      matchedDonationIds: ['don_1002'],
      timeline: [
        event('created', REQUEST_STATUS_LABEL.created, t - 4 * DAY),
        event('searching', REQUEST_STATUS_LABEL.searching, t - 4 * DAY + 2 * HOUR),
        event('matched', REQUEST_STATUS_LABEL.matched, t - 2 * DAY),
      ],
      createdAt: t - 4 * DAY,
      updatedAt: t - 2 * DAY,
    },
    {
      id: 'req_3004',
      requestorId: 'user_ngo_3',
      requestorName: 'Paws & Claws Rescue',
      requestorRole: 'ngo',
      requestorVerification: 'pending',
      title: 'Feed for 60 rescued street dogs',
      category: 'animal_food',
      quantity: 40,
      unit: 'kg',
      urgency: 'high',
      requiredBy: t + 3 * DAY,
      location: {
        latitude: 12.9352,
        longitude: 77.6245,
        address: 'Paws & Claws Shelter, Koramangala 6th Block',
        city: 'Bengaluru',
      },
      description: 'Dry kibble for our shelter dogs. We are down to two days of stock.',
      beneficiaryCount: 60,
      status: 'searching',
      fulfilledQuantity: 0,
      matchedDonationIds: [],
      timeline: [
        event('created', REQUEST_STATUS_LABEL.created, t - 30 * HOUR),
        event('searching', REQUEST_STATUS_LABEL.searching, t - 29 * HOUR),
      ],
      createdAt: t - 30 * HOUR,
      updatedAt: t - 29 * HOUR,
    },
    {
      id: 'req_3005',
      requestorId: 'user_requestor_demo',
      requestorName: 'Lakshmi Devi',
      requestorRole: 'requestor',
      requestorVerification: 'verified',
      title: 'Hygiene kits for the settlement',
      category: 'essentials',
      quantity: 40,
      unit: 'kits',
      urgency: 'medium',
      requiredBy: t + 12 * DAY,
      location: {
        latitude: 12.9401,
        longitude: 77.6256,
        address: 'Ejipura Settlement, Block C',
        city: 'Bengaluru',
      },
      description: 'Soap, sanitary pads and toothpaste for 40 households.',
      beneficiaryCount: 160,
      status: 'created',
      fulfilledQuantity: 0,
      matchedDonationIds: [],
      timeline: [event('created', REQUEST_STATUS_LABEL.created, t - 8 * HOUR)],
      createdAt: t - 8 * HOUR,
      updatedAt: t - 8 * HOUR,
    },
    {
      id: 'req_3006',
      requestorId: 'user_requestor_demo',
      requestorName: 'Lakshmi Devi',
      requestorRole: 'requestor',
      requestorVerification: 'verified',
      title: 'Grocery kits — fulfilled last month',
      category: 'groceries',
      quantity: 25,
      unit: 'kits',
      urgency: 'high',
      requiredBy: t - 4 * DAY,
      location: {
        latitude: 12.9401,
        longitude: 77.6256,
        address: 'Ejipura Settlement, Block C',
        city: 'Bengaluru',
      },
      description: 'Completed request, kept for history.',
      beneficiaryCount: 112,
      status: 'completed',
      fulfilledQuantity: 25,
      matchedDonationIds: ['don_1003'],
      timeline: [
        event('created', REQUEST_STATUS_LABEL.created, t - 9 * DAY),
        event('searching', REQUEST_STATUS_LABEL.searching, t - 9 * DAY + HOUR),
        event('matched', REQUEST_STATUS_LABEL.matched, t - 8 * DAY),
        event('fulfilled', REQUEST_STATUS_LABEL.fulfilled, t - 5 * DAY),
        event('completed', REQUEST_STATUS_LABEL.completed, t - 5 * DAY + HOUR),
      ],
      createdAt: t - 9 * DAY,
      updatedAt: t - 5 * DAY,
    },
  ];

  // Build stored matches from the real engine so scores are always consistent.
  const pairings: Array<[string, string, Match['status']]> = [
    ['don_1001', 'req_3001', 'accepted'],
    ['don_1002', 'req_3003', 'accepted'],
    ['don_2004', 'req_3002', 'proposed'],
    ['don_2002', 'req_3004', 'proposed'],
    ['don_2003', 'req_3005', 'proposed'],
  ];

  const matches: Match[] = pairings.flatMap(([donationId, requestId, status]) => {
    const donation = donations.find((d) => d.id === donationId);
    const request = requests.find((r) => r.id === requestId);
    if (!donation || !request) return [];
    const breakdown = scoreMatch(donation, request, { now: t });
    return [
      {
        id: `match_${donationId}_${requestId}`,
        donationId,
        requestId,
        donorId: donation.donorId,
        receiverId: request.requestorId,
        donationTitle: donation.title,
        requestTitle: request.title,
        donorName: donation.donorName,
        receiverName: request.requestorName,
        status,
        ...breakdown,
        createdAt: t - 3 * HOUR,
        updatedAt: t - HOUR,
      },
    ];
  });

  // Link accepted matches back onto their donations.
  matches
    .filter((m) => m.status === 'accepted')
    .forEach((m) => {
      const donation = donations.find((d) => d.id === m.donationId);
      if (!donation) return;
      donation.matchId = m.id;
      donation.matchedRequestId = m.requestId;
      donation.matchedReceiverId = m.receiverId;
      donation.matchedReceiverName = m.receiverName;
      donation.matchScore = m.matchScore;
    });

  const taskSeeds: Array<{
    id: string;
    donationId: string;
    status: DeliveryTask['status'];
    volunteerId?: string;
    scheduledIn: number;
  }> = [
    { id: 'task_4001', donationId: 'don_1001', status: 'available', scheduledIn: 2 * HOUR },
    {
      id: 'task_4002',
      donationId: 'don_1002',
      status: 'accepted',
      volunteerId: 'user_volunteer_demo',
      scheduledIn: DAY,
    },
    { id: 'task_4003', donationId: 'don_2001', status: 'available', scheduledIn: HOUR },
    { id: 'task_4004', donationId: 'don_2004', status: 'available', scheduledIn: 18 * HOUR },
  ];

  const tasks: DeliveryTask[] = taskSeeds.flatMap((seed) => {
    const donation = donations.find((d) => d.id === seed.donationId);
    if (!donation) return [];
    const match = matches.find((m) => m.donationId === donation.id);
    const request = requests.find((r) => r.id === match?.requestId) ?? requests[0];
    const receiver = users.find((u) => u.id === request.requestorId);
    const distanceKm = roadDistanceKm(donation.location, request.location);
    return [
      {
        id: seed.id,
        donationId: donation.id,
        matchId: match?.id,
        requestId: request.id,
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
        dropoff: {
          name: request.requestorName,
          address: request.location.address,
          latitude: request.location.latitude,
          longitude: request.location.longitude,
          contactName: receiver?.name,
          contactPhone: receiver?.phone,
        },
        distanceKm,
        estimatedMinutes: estimateMinutes(distanceKm),
        pickupWindow: donation.pickupTime,
        scheduledFor: t + seed.scheduledIn,
        status: seed.status,
        volunteerId: seed.volunteerId,
        volunteerName: seed.volunteerId ? 'Rohit Sharma' : undefined,
        timeline:
          seed.status === 'available'
            ? [event('available', TASK_STATUS_LABEL.available, t - HOUR)]
            : [
                event('available', TASK_STATUS_LABEL.available, t - 4 * HOUR),
                event('accepted', TASK_STATUS_LABEL.accepted, t - 3 * HOUR),
              ],
        createdAt: t - 4 * HOUR,
        updatedAt: t - HOUR,
      },
    ];
  });

  // Historical volunteer deliveries for the volunteer impact panel.
  for (let i = 0; i < 12; i += 1) {
    const created = t - (2 + i * 2) * DAY;
    const distanceKm = 3 + (i % 5) * 1.8;
    tasks.push({
      id: `task_hist_${i}`,
      donationId: `don_hist_${i}`,
      title: `Completed delivery #${i + 1}`,
      category: i % 2 === 0 ? 'food_items' : 'clothes',
      quantity: 20 + i * 3,
      unit: i % 2 === 0 ? 'meals' : 'items',
      pickup: {
        name: 'Grand Vista Hotel',
        address: 'MG Road, Bengaluru',
        latitude: 12.9752,
        longitude: 77.6063,
      },
      dropoff: {
        name: i % 2 === 0 ? 'Anna Seva Foundation' : 'Hope Shelter Trust',
        address: i % 2 === 0 ? 'Shivajinagar' : 'Jayanagar',
        latitude: i % 2 === 0 ? 12.9856 : 12.9299,
        longitude: i % 2 === 0 ? 77.6047 : 77.5826,
      },
      distanceKm,
      estimatedMinutes: estimateMinutes(distanceKm),
      pickupWindow: '18:00 – 19:00',
      scheduledFor: created,
      status: 'completed',
      volunteerId: 'user_volunteer_demo',
      volunteerName: 'Rohit Sharma',
      timeline: [
        event('available', TASK_STATUS_LABEL.available, created - 2 * HOUR),
        event('accepted', TASK_STATUS_LABEL.accepted, created - HOUR),
        event('picked_up', TASK_STATUS_LABEL.picked_up, created),
        event('delivered', TASK_STATUS_LABEL.delivered, created + HOUR),
        event('completed', TASK_STATUS_LABEL.completed, created + HOUR + 10 * 60000),
      ],
      createdAt: created - 3 * HOUR,
      updatedAt: created + HOUR,
    });
  }

  const notifications: AppNotification[] = [
    {
      id: 'ntf_1',
      userId: 'user_donor_demo',
      title: 'Your donation has been matched',
      body: 'Anna Seva Foundation needs 150 meals tonight — your wedding catering surplus is an excellent match.',
      kind: 'match',
      read: false,
      link: '/app/donations/don_1001',
      createdAt: t - 40 * 60000,
    },
    {
      id: 'ntf_2',
      userId: 'user_donor_demo',
      title: 'Your pickup has been scheduled',
      body: 'Rohit Sharma will collect the winter clothing tomorrow between 10:00 and 13:00.',
      kind: 'pickup',
      read: false,
      link: '/app/donations/don_1002',
      createdAt: t - 3 * HOUR,
    },
    {
      id: 'ntf_3',
      userId: 'user_donor_demo',
      title: 'Your donation was successfully delivered',
      body: '25 grocery kits reached 112 people in Ejipura. Thank you.',
      kind: 'delivery',
      read: true,
      link: '/app/donations/don_1003',
      createdAt: t - 5 * DAY,
    },
    {
      id: 'ntf_4',
      userId: 'user_ngo_demo',
      title: 'A new donation matches your request',
      body: '120 hot vegetarian meals available 3.6 km away, ready for pickup at 20:00.',
      kind: 'match',
      read: false,
      link: '/app/browse',
      createdAt: t - 40 * 60000,
    },
    {
      id: 'ntf_5',
      userId: 'user_volunteer_demo',
      title: 'A new pickup task is available',
      body: 'Indiranagar → Shivajinagar, 4.6 km, 120 meals. Pickup at 20:00.',
      kind: 'pickup',
      read: false,
      link: '/app/tasks',
      createdAt: t - HOUR,
    },
    {
      id: 'ntf_6',
      userId: 'user_requestor_demo',
      title: 'Your request has been matched',
      body: 'A grocery donation covering 8 of 34 kits is on its way to you.',
      kind: 'request',
      read: false,
      link: '/app/requests/req_3002',
      createdAt: t - 20 * HOUR,
    },
  ];

  return {
    users,
    credentials,
    donations,
    requests,
    matches,
    tasks,
    notifications,
  } as Record<string, Array<{ id: string }>>;
}

export const DEMO_ACCOUNTS = [
  { role: 'Donor', email: 'donor@donum.app', password: 'donum123', name: 'Aarav Mehta' },
  { role: 'NGO', email: 'ngo@donum.app', password: 'donum123', name: 'Anna Seva Foundation' },
  { role: 'Volunteer', email: 'volunteer@donum.app', password: 'donum123', name: 'Rohit Sharma' },
  { role: 'Requestor', email: 'requestor@donum.app', password: 'donum123', name: 'Lakshmi Devi' },
] as const;
