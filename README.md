# DONUM — Turn Surplus Into Impact

**DONUM connects surplus to scarcity.**

A production-ready donation distribution and resource-matching platform that links people with surplus resources to NGOs, volunteers and community members who need them — with intelligent matching, real-time tracking, and verified impact.

<p align="center">
  <em>React · TypeScript · Vite · Tailwind CSS · Firebase · Google Maps</em>
</p>

---

## Quick start

```bash
npm install
npm run dev          # → http://localhost:5173
```

DONUM runs **immediately, with no configuration**. With no Firebase keys present it uses a built-in offline-first realtime store seeded with a realistic city network, so every dashboard, chart, map and match is populated on first load.

### Demo accounts

Password for all: `donum123` (or click a role on the sign-in screen).

| Role | Email | Who they are |
| --- | --- | --- |
| Donor | `donor@donum.app` | Aarav Mehta — runs a catering kitchen |
| NGO | `ngo@donum.app` | Anna Seva Foundation — feeds 400+ daily |
| Volunteer | `volunteer@donum.app` | Rohit Sharma — 124 deliveries completed |
| Requestor | `requestor@donum.app` | Lakshmi Devi — coordinates for 34 families |

---

## What's implemented

### Four roles, four purpose-built dashboards

| Role | Capabilities |
| --- | --- |
| **Donor** | Create donations with images, quantity, category, expiry & pickup location · track status · view matched receiver · history · impact stats · notifications |
| **NGO** | Register & submit verification (registration no. + FSSAI) · browse and filter donations · accept/reject · create requests · manage pickups · impact |
| **Volunteer** | Register with ID & vehicle · view available tasks · accept · navigate · update pickup and delivery status · history · impact |
| **Requestor** | Create resource requests with category, quantity, urgency & location · track status · receive matched donations |

### Intelligent matching engine

DONUM does **not** match on distance alone. Every donation/request pair is scored across five weighted, fully configurable dimensions:

```
match_score = 0.30 × distance + 0.25 × urgency + 0.20 × category
            + 0.15 × quantity + 0.10 × expiry
```

| Factor | Behaviour |
| --- | --- |
| **Distance** | `<2 km → 1.0` · `2–5 → 0.8` · `5–10 → 0.6` · `10–20 → 0.4` · `>20 → 0.2` |
| **Urgency** | `critical 1.0` · `high 0.8` · `medium 0.5` · `low 0.2` |
| **Category** | exact `1.0` · related `0.5` · incompatible `0` (hard veto) |
| **Quantity** | full coverage `1.0`, partial scales linearly, oversupply gently penalised |
| **Expiry** | perishables nearing expiry prioritised; already-expired scores `0` |

Every match stores its **full breakdown** (`matchScore`, `distanceScore`, `urgencyScore`, `categoryScore`, `quantityScore`, `expiryScore`) plus a plain-English explanation:

> *"Matched because it's only 3.6 km away, the request is critical priority, the category matches exactly and the quantity covers the need."*

Normal users see the sentence and a confidence bar; the algorithmic detail sits behind *"How this was calculated."*

📍 `src/features/matching/engine.ts` · 14 unit tests in `engine.test.ts`

### Lifecycles

```
Donation:  created → matching → matched → accepted → pickup_scheduled
           → picked_up → delivered → completed
           (failures: cancelled · expired · rejected)

Request:   created → searching → matched → fulfilled → completed

Delivery:  available → accepted → going_to_pickup → picked_up
           → out_for_delivery → delivered → completed
```

Each is rendered as a visual timeline, with a compact progress strip on list cards. Donations past their expiry are swept automatically.

### Real-time tracking

Every collection is backed by a live listener (Firestore `onSnapshot`, or the local store's equivalent). When a volunteer marks a pickup complete, the donor's dashboard, the NGO's pickup list and the notification bell all update at once — no refresh.

### Maps

Google Maps renders when `VITE_GOOGLE_MAPS_API_KEY` is set, with role-aware markers (current location / pickup / destination) and route polylines. **Without a key**, DONUM falls back to a built-in schematic map that projects real coordinates onto a clean canvas with accurate distances and routes — so maps are never broken or blank.

### Impact analytics

Headline metrics (donations, people reached, resources distributed, volunteer hours, distance covered, waste diverted) plus three charts — *donations by category*, *donations over time*, *impact by location* — rendered as dependency-free SVG. Estimation constants are documented in `src/features/analytics/impact.ts`.

---

## Architecture

```
src/
├── components/      ui/ · common/ · charts/ · map/
├── context/         AuthContext · DataContext · ToastContext
├── features/        one folder per domain capability
│   ├── auth/            authService.ts
│   ├── donations/       donationService.ts (+ lifecycle.test.ts)
│   ├── requests/        requestService.ts
│   ├── matching/        engine.ts (+ engine.test.ts) · matchService.ts
│   │                    MatchExplanation.tsx
│   ├── tracking/        taskService.ts (volunteer delivery state machine)
│   ├── notifications/   notificationService.ts
│   └── analytics/       impact.ts
├── firebase/        config · app · storage · messaging
├── hooks/           useCountUp · useGeolocation · useGoogleMaps
├── layouts/         AppLayout (role-aware nav) · PublicLayout
├── pages/           donor/ · ngo/ · volunteer/ · requestor/ · requests/
│                    shared/ · auth/ · onboarding/ · LandingPage
├── services/        infrastructure only — db · localStore · seed
├── types/           shared domain model
└── utils/           geo · format · labels · urgency · cn
```

`features/` holds domain logic and `services/` holds the infrastructure it runs
on: `db.ts` is the storage port, `localStore.ts` its browser adapter, `seed.ts`
the demo dataset. The storage layer never imports a feature, so each capability
can be read, tested, or replaced on its own — an invariant enforced by a test
(`src/services/architecture.test.ts`) rather than left to good intentions.

`seed.ts` is the deliberate exception: it calls the real matching engine, so the
scores shown on demo data are genuinely computed rather than hand-written
numbers that would drift the moment the weights changed.

### The dual-backend design

`src/services/db.ts` exposes one API with two implementations:

- **Firebase configured** → Firestore, Firebase Auth, Cloud Storage, FCM.
- **Not configured** → a local realtime store with identical listener semantics, persisted to `localStorage`.

The UI never branches on backend. Adding credentials to `.env` switches the whole app over with **zero code changes**, which keeps the project runnable in CI, demos and offline development.

---

## Connecting Firebase

```bash
cp .env.example .env    # fill in your project values
```

Then enable in the Firebase console:

1. **Authentication** → Email/Password (and Google, optional — the flow is already wired).
2. **Firestore** → create the database.
3. **Storage** → for donation images.
4. **Cloud Messaging** → copy the Web Push VAPID key into `VITE_FIREBASE_VAPID_KEY`, and fill the config block in `public/firebase-messaging-sw.js`.

Ship the included rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

| File | Purpose |
| --- | --- |
| `firestore.rules` | Owner-scoped writes; users cannot self-approve verification; notifications are private |
| `storage.rules` | Donation images: public read, owner-only write, 5 MB image-only limit |
| `firestore.indexes.json` | Composite indexes for the dashboard and browse queries |

### Firestore data model

```
users/{userId}            name, email, phone, role, profileImage, location,
                          latitude, longitude, verificationStatus,
                          createdAt, updatedAt  (+ role-specific fields)
donations/{donationId}    title, category, quantity, unit, condition, expiryDate,
                          pickupDate, location, images, foodDetails, status, timeline
requests/{requestId}      category, quantity, urgency, requiredBy, location,
                          beneficiaryCount, status, fulfilledQuantity, timeline
matches/{matchId}         donationId, requestId, donorId, receiverId, matchScore,
                          distanceScore, urgencyScore, categoryScore,
                          quantityScore, expiryScore, status, createdAt
tasks/{taskId}            pickup, dropoff, distanceKm, estimatedMinutes, status, timeline
notifications/{id}        userId, title, body, kind, read, link, createdAt
```

---

## Design system

Purple-led, deliberately restrained — a modern social-impact product, not a traditional NGO site.

| Token | Value |
| --- | --- |
| Primary | `#6C3CE9` |
| Secondary | `#8B5CF6` |
| Background | `#F8F7FC` |
| Dark | `#171321` |
| Success / Warning / Danger | `#22C55E` / `#F59E0B` / `#EF4444` |

Rounded cards, soft shadows, clear status badges, Plus Jakarta Sans, and mobile-first responsive layout (sidebar on desktop, bottom tab bar on mobile). Respects `prefers-reduced-motion`.

---

## Testing

```bash
npm test            # 111 unit, service, security and architecture tests
npm run test:smoke  # 8 runtime smoke tests (mounts the real app)
npm run test:all    # everything
npm run typecheck   # tsc -b, zero errors
npm run build       # production build
```

**Unit & integration** (`vitest.config.ts`) — 111 tests covering the matching
engine against every documented scoring band, the three lifecycle state
machines (including the illegal transitions they must *reject*), all six browse
filters asserted on the resulting data rather than on rendered controls,
derived urgency thresholds, FCM token persistence under concurrent
registration, upload validation, Cloud Function push fan-out and token pruning,
coordinate hardening, a static audit of every Firestore rule, and an
architecture guard that fails the build if the storage layer imports a feature.
A full lifecycle test drives the real services end to end: donation created →
auto-matched → accepted → delivery task → all seven volunteer transitions →
completed, asserting donation, request, task and notification state stay
consistent.

**Runtime smoke** (`vitest.smoke.config.ts`) — mounts the actual application in
jsdom, signs in as each of the four roles, walks every major route and **fails
on any console error**.

Testing has caught eight real defects in this codebase so far, each fixed and
pinned by a regression test: a same-tab session bug that bounced users back to
sign-in; form labels not associated with their inputs; FCM tokens fetched then
discarded so push could never be delivered; multi-device token loss from a
read-modify-write; unguarded lifecycle writes that let a donation skip the
chain of custody; four Firestore authorisation holes; duplicate pickup
reminders from a non-idempotent scheduled function; and NaN distances that made
donations silently vanish from filters.

---

## Cloud Functions

`functions/` contains the server-side half of the notification system and the
maintenance that cannot depend on a browser tab being open:

| Function | Trigger | Does |
| --- | --- | --- |
| `sendNotificationPush` | `onCreate notifications/{id}` | Fans the notification out to every device token on the user, and prunes tokens FCM reports as dead |
| `expireStaleDonations` | hourly | Expires donations that passed their window while unclaimed |
| `pickupReminders` | every 30 min | Reminds volunteers about pickups starting within the hour |

```bash
cd functions && npm install && npm run deploy
```

Device tokens are stored as `users/{id}.fcmTokens[]` — an array, appended with
`arrayUnion`, so a user signed in on both phone and laptop is reached on both
and neither device can clobber the other's registration.

`pickupReminders` is idempotent: it runs every 30 minutes but looks an hour
ahead, so it claims a `pickupReminderSentAt` marker inside the same transaction
that writes the notification. Without that, every volunteer would be reminded
twice.

---

## Verified, and not verified

Being precise about this matters more than a green checkmark:

| Area | How it is verified |
| --- | --- |
| Matching, urgency, filters, lifecycles, geo, uploads | Unit tests against real data |
| Service integration | Lifecycle test driving the real services over the local store |
| App boots and every route renders | Runtime smoke tests, failing on any console error |
| Firestore rules | **Static analysis only** — see below |
| Cloud Functions | Pure logic unit-tested; triggers typecheck and compile |
| Firebase backend end to end | **Not verified here** — needs project credentials |

`src/services/securityRules.test.ts` parses `firestore.rules` and asserts the
specific holes found in the audit stay closed. That is not the same as
behavioural verification: the proper tool is `@firebase/rules-unit-testing`
against the emulator, which needs firebase v12 (this project is on v10) and a
JVM, neither available in this environment. Before going live, run the rules
against the emulator suite.

Equally, the Cloud Functions compile and their logic is tested, but they have
not been executed against a live project. `firebase emulators:start` will
exercise them once credentials exist.

---

## Notes on scope

- **Verification workflow** — status (`pending` / `verified` / `rejected`) is modelled, enforced in rules and surfaced throughout the UI. Admin review tooling to *change* that status is intentionally out of scope; in production it belongs behind an admin console with custom claims.
- **Donation urgency is derived, not entered.** Requests carry an explicit urgency set by the requestor; a donation's urgency is computed from real time pressure (expiry + pickup window) in `src/utils/urgency.ts`, so NGOs can triage the browse list without donors having to self-report priority.
- **Geocoding** — addresses are entered as text with coordinates from device geolocation. Dropping in the Places Autocomplete widget is a small addition wherever `VITE_GOOGLE_MAPS_API_KEY` is available.

---

<p align="center"><strong>DONUM</strong> — because usable food, clothes and essentials should reach people, not landfill.</p>
