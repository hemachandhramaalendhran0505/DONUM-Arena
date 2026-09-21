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
├── features/
│   ├── matching/    engine.ts (+ tests) · MatchExplanation.tsx
│   └── analytics/   impact.ts
├── firebase/        config · app · storage · messaging
├── hooks/           useCountUp · useGeolocation · useGoogleMaps
├── layouts/         AppLayout (role-aware nav) · PublicLayout
├── pages/           donor/ · ngo/ · volunteer/ · requestor/ · requests/
│                    shared/ · auth/ · onboarding/ · LandingPage
├── services/        db · authService · donationService · requestService
│                    matchService · taskService · notificationService
│                    localStore · seed
├── types/           shared domain model
└── utils/           geo · format · labels · cn
```

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
npm test          # 18 unit + service-layer tests
npm run test:smoke  # 8 runtime smoke tests (mounts the real app)
npm run test:all    # everything
npm run typecheck   # tsc -b, zero errors
npm run build       # production build
```

**Unit & integration** (`vitest.config.ts`) — matching engine maths against every documented scoring band, and a full lifecycle test driving the real services: donation created → auto-matched → accepted → delivery task → all seven volunteer transitions → completed, asserting donation, request, task and notification state stay consistent.

**Runtime smoke** (`vitest.smoke.config.ts`) — mounts the actual application in jsdom, signs in as each of the four roles, walks every major route and **fails on any console error**. This caught two real defects during development: a same-tab session-notification bug that bounced users back to sign-in, and form labels not associated with their inputs.

---

## Notes on scope

- **Verification workflow** — status (`pending` / `verified` / `rejected`) is modelled, enforced in rules and surfaced throughout the UI. Admin review tooling to *change* that status is intentionally out of scope; in production it belongs behind an admin console or Cloud Function.
- **Push delivery** — FCM registration, the service worker and the notification pipeline are wired. Actual server-side fan-out needs a Cloud Function trigger on `notifications/`; in local mode DONUM uses the browser's Notification API so the experience is real.
- **Geocoding** — addresses are entered as text with coordinates from device geolocation. Dropping in the Places Autocomplete widget is a small addition wherever `VITE_GOOGLE_MAPS_API_KEY` is available.

---

<p align="center"><strong>DONUM</strong> — because usable food, clothes and essentials should reach people, not landfill.</p>
