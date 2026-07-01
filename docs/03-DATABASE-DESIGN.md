# Database Design — AQD (عقد)

MongoDB Atlas, Mongoose ODM. Document-oriented schema, denormalized where read performance matters (e.g., profile search index), referenced (`ObjectId`) where write consistency matters (e.g., payments ↔ subscriptions).

## 1. Collections Overview

| Collection | Purpose |
|---|---|
| `users` | Auth identity + role. One doc per login-capable account (regular user **or** admin-panel staff — same collection, differentiated by `role`) |
| `profiles` | Matrimonial profile data, 1:1 with a `user` of role `user`/`premium`/`vip` |
| `families` | Optional guardian/Wali linkage to a profile |
| `subscriptions` | Active/historical plan state per user |
| `payments` | Payment transactions (Razorpay) |
| `invoices` | GST invoice records, linked to `payments` |
| `chats` | Conversation threads (2-party) |
| `messages` | Individual chat messages, referencing `chats` |
| `notifications` | In-app notification log |
| `favorites` / `shortlists` / `interests` | User-to-user interaction edges |
| `matches` | Staff-curated match suggestions (matchmaking-staff → client), **not** an agent-owned collection — `assignedStaffId` references a `users` doc with role `matchmaking_staff` or `support_staff` |
| `reports` | User-submitted reports (profile/chat abuse) |
| `blogs`, `cms_pages`, `testimonials`, `success_stories`, `faqs`, `banners` | CMS content |
| `countries`, `states`, `cities`, `areas` | Location master data |
| `documents` | Verification document uploads (S3 references) |
| `photos` | Gallery photo metadata (S3 references, visibility) |
| `audit_logs` | Immutable log of privileged actions |

There is no `agents` collection. Staff identity lives in `users` with role `support_staff` or `matchmaking_staff`; assignment relationships live on `profiles.assignedStaffId` and `matches.assignedStaffId`.

## 2. Core Schemas

### 2.1 `users`
```ts
{
  _id: ObjectId,
  email: string,            // unique, indexed
  phone: string,            // unique sparse index
  passwordHash: string,
  role: 'guest' | 'user' | 'premium' | 'vip' | 'support_staff' | 'matchmaking_staff' | 'admin' | 'super_admin',
  status: 'pending_verification' | 'active' | 'suspended' | 'deleted',
  emailVerifiedAt: Date | null,
  twoFactorEnabled: boolean,
  twoFactorSecret: string | null,   // encrypted at rest
  refreshTokenHash: string | null,  // current rotated refresh token hash
  lastLoginAt: Date,
  lastActiveAt: Date,
  createdAt: Date,
  updatedAt: Date,
}
```
Indexes: `{ email: 1 }` unique, `{ phone: 1 }` unique sparse, `{ role: 1, status: 1 }`.

### 2.2 `profiles`
```ts
{
  _id: ObjectId,
  userId: ObjectId,          // ref users, unique index
  personal: {
    firstName, lastName, dob, gender, height, maritalStatus, bio,
  },
  family: { fatherOccupation, motherOccupation, siblings, familyType, familyValues },
  education: { level, field, institution },
  occupation: { title, industry, incomeBand },
  religion: { religion: 'Islam', sect, maslak, prayerStatus },
  lifestyle: { diet, smoking, languages: [String] },
  location: {
    country, state, district, city, area, pincode,
    geo: { type: 'Point', coordinates: [lng, lat] },  // 2dsphere indexed
  },
  partnerPreferences: { ageMin, ageMax, heightMin, heightMax, sect, maslak, location, education, income },
  privacy: { hidePhotos: boolean, hideContact: boolean, hideLastActive: boolean },
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected',
  assignedStaffId: ObjectId | null,   // ref users (role support_staff|matchmaking_staff), set only by an admin-panel action
  profileCompleteness: number,        // 0-100, computed
  createdAt: Date,
  updatedAt: Date,
}
```
Indexes: `{ userId: 1 }` unique, `{ 'location.geo': '2dsphere' }`, Atlas Search index over personal/education/occupation/religion/location for full-text + faceted search.

### 2.3 `families` (Guardian/Wali link)
```ts
{
  _id: ObjectId,
  profileId: ObjectId,       // ref profiles
  guardianUserId: ObjectId,  // ref users
  relationship: 'father' | 'mother' | 'brother' | 'sister' | 'guardian',
  canApproveInterests: boolean,
  canViewChats: boolean,
  createdAt: Date,
}
```

### 2.4 `matches` (staff-curated suggestions)
```ts
{
  _id: ObjectId,
  clientProfileId: ObjectId,     // the paying VIP/Premium client
  suggestedProfileId: ObjectId,  // the suggested match
  assignedStaffId: ObjectId,     // ref users, role in {support_staff, matchmaking_staff, admin}
  note: string,
  status: 'suggested' | 'viewed' | 'accepted' | 'declined',
  createdAt: Date,
}
```
Every write to this collection happens through an Admin Panel action and is mirrored into `audit_logs`.

### 2.5 `subscriptions`
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  plan: 'free' | 'basic' | 'premium' | 'vip',
  billingCycle: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly',
  status: 'active' | 'expired' | 'cancelled' | 'grace_period',
  startedAt: Date,
  currentPeriodEnd: Date,
  autoRenew: boolean,
  addOns: [{ type: 'dedicated_matchmaking' | 'video_consultation', activatedAt: Date }],
}
```
Index: `{ userId: 1, status: 1 }`, `{ currentPeriodEnd: 1 }` for renewal-job scans.

### 2.6 `payments` / `invoices`
```ts
// payments
{ _id, userId, subscriptionId, razorpayOrderId, razorpayPaymentId, amount, currency, status, method, createdAt }
// invoices
{ _id, paymentId, invoiceNumber, gstAmount, totalAmount, pdfUrl, issuedAt }
```

### 2.7 `chats` / `messages`
```ts
// chats
{ _id, participantIds: [ObjectId, ObjectId], lastMessageAt, createdAt }
// messages
{ _id, chatId, senderId, type: 'text'|'image'|'voice'|'document', content, mediaUrl, readAt, createdAt }
```
Index: `{ chatId: 1, createdAt: -1 }`.

### 2.8 `interests` / `favorites` / `shortlists`
```ts
{ _id, fromUserId, toUserId, status: 'pending'|'accepted'|'declined', createdAt }
```
Compound unique index `{ fromUserId: 1, toUserId: 1 }` on each to prevent duplicates.

### 2.9 `audit_logs`
```ts
{
  _id: ObjectId,
  actorId: ObjectId,        // staff/admin user performing the action
  action: string,            // e.g. 'profile.verify', 'match.assign', 'user.suspend'
  targetType: string,
  targetId: ObjectId,
  before: Object | null,
  after: Object | null,
  ip: string,
  createdAt: Date,
}
```
Append-only; no update/delete API exposed. TTL/archival policy handled by a scheduled export job, not deletion.

## 3. Entity Relationship Overview

```
users (1) ──── (1) profiles ──── (0..1) families
  │                  │
  │                  ├── (0..n) photos
  │                  ├── (0..n) documents
  │                  └── (0..n) matches  ←── assignedStaffId (users, role=staff)
  │
  ├── (0..n) subscriptions ──── (0..n) payments ──── (1) invoices
  ├── (0..n) interests/favorites/shortlists (self-referencing via toUserId)
  ├── (0..n) chats ──── (0..n) messages
  └── (0..n) notifications
```

## 4. Indexing Strategy Summary
- Unique indexes on all natural keys (`email`, `phone`, `userId` on `profiles`).
- `2dsphere` on `profiles.location.geo` for radius search.
- Atlas Search index for weighted full-text + faceted filtering (age, height, education, income, sect, maslak).
- Compound indexes on high-frequency query paths (`{ status: 1, createdAt: -1 }` on `matches`, `reports`).
- TTL index on ephemeral OTP/session collections if introduced later.
