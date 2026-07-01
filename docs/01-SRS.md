# Software Requirement Specification (SRS)
## AQD (عقد) — Muslim Marriage Bureau Platform

**Tagline:** Where Faith Meets Commitment
**Version:** 1.0
**Status:** Draft

---

## 1. Introduction

### 1.1 Purpose
AQD is a Halal-compliant matrimonial SaaS platform connecting Muslim individuals and their families for the purpose of marriage (Nikah), with privacy, modesty, and family involvement built into the product experience rather than bolted on as an afterthought.

### 1.2 Scope
AQD provides:
- Verified user profile creation and management
- Location- and preference-based match search
- Guardian/family (Wali) participation in the matchmaking process
- Paid premium matchmaking services fulfilled by internal staff (not a self-service "agent" login/portal — see 1.4)
- Tiered subscription plans
- Real-time private chat and WhatsApp notifications
- An admin panel for platform operations, verification, and content management

### 1.3 Out of Scope (this revision)
- **Agent self-service login/portal.** Earlier drafts of this spec included an independent Agent role with its own login and dashboard. This has been **removed** by product decision. Matchmaking staff operate exclusively through the **Admin Panel** under elevated RBAC roles (`support_agent`, `matchmaking_staff`) — there is no separate agent-facing application, no agent registration flow, and no public agent login page. Any "assigned matchmaker" a user sees is a label on their profile, populated by an admin-side action.
- Video calling infrastructure (may be added in a later phase via a third-party embed)
- Native mobile apps (web is mobile-first/responsive; native wrapper is a future phase)

### 1.4 Definitions
| Term | Meaning |
|---|---|
| Nikah | Islamic marriage contract |
| Wali | Legal guardian required in the marriage process for many users, often a parent |
| Maslak | School of Islamic jurisprudence/thought within a sect |
| RBAC | Role-Based Access Control |
| PII | Personally Identifiable Information |

---

## 2. Overall Description

### 2.1 User Roles
| Role | Description |
|---|---|
| Guest | Unauthenticated visitor; can view landing pages, plans, blog, FAQ |
| Registered User | Free-tier member with a profile |
| Premium User | Paid subscriber with expanded search/contact limits |
| VIP User | Top-tier subscriber with dedicated matchmaking service, unlimited contacts |
| Family/Guardian (Wali) Linked Account | Optional linked account with view/approve rights on a dependent's profile and interests |
| Customer Support Staff | Internal admin-panel role; handles tickets, reports, verification |
| Matchmaking Staff | Internal admin-panel role; manages VIP/Premium match recommendations, notes, client tracking — **replaces the standalone Agent role/portal** |
| Admin | Platform operations, CMS, subscriptions, payments |
| Super Admin | Full system access, role management, audit logs |

Note: There is no `Agent` role in the authentication system and no `/agent/login` route. Matchmaking Staff and Customer Support Staff authenticate through the same hardened admin login as Admin/Super Admin, scoped down by RBAC permissions.

### 2.2 Product Positioning
AQD differentiates from generic dating/matrimonial apps through:
- Islamic-values-first UX (modesty controls, photo privacy, Wali involvement)
- Verified-profile emphasis over swipe-volume
- Staff-assisted matchmaking as a paid tier, run internally rather than via a marketplace of independent agents

---

## 3. Functional Requirements

### 3.1 Authentication & Account
- FR-1: Email + password registration with email verification (OTP or link)
- FR-2: OTP login via SMS/WhatsApp as an alternative to password
- FR-3: Optional Google OAuth sign-in
- FR-4: Forgot/reset password flow with time-limited signed tokens
- FR-5: Two-Factor Authentication (TOTP) opt-in for account security
- FR-6: JWT access token (short-lived) + refresh token (rotated, stored httpOnly)
- FR-7: Single unified **Admin Login** (`/admin/login`) for Support Staff, Matchmaking Staff, Admin, Super Admin — differentiated entirely by RBAC role, not by separate portals
- FR-8: Session listing and remote revoke ("log out other devices")

### 3.2 Profile Management
- FR-9: Multi-step profile builder: personal, family, education, occupation, income, religion, sect, maslak, lifestyle, prayer status, bio, partner preferences
- FR-10: Location fields: country, state, district, city, area, pincode, with geocoding for radius search
- FR-11: Photo gallery with per-photo visibility (public / connections-only / on-request)
- FR-12: Identity/verification document upload (reviewed by Support Staff in Admin Panel)
- FR-13: Privacy controls: hide contact info, hide photos, hide "last active", block/report
- FR-14: Optional linked Guardian account with read/approve permissions over a dependent profile

### 3.3 Search & Discovery
- FR-15: Filter search by age, height, education, profession, income band, language, religion, sect, maslak, marital status, location, verified-only, premium-only, recently joined, last active
- FR-16: Location/radius search with map integration
- FR-17: Atlas Search-backed full-text and faceted search with saved search alerts

### 3.4 Interaction
- FR-18: Express Interest, Favorite, Shortlist, Ignore, Block, Report
- FR-19: Contact request / photo request workflow requiring recipient approval
- FR-20: Real-time 1:1 chat (text, image, voice note, document) gated behind mutual interest acceptance or plan tier
- FR-21: Typing indicator, read receipts, online presence
- FR-22: WhatsApp click-to-chat and notification delivery (OTP, interest received, subscription reminders)

### 3.5 Matchmaking Services (Staff-Fulfilled)
- FR-23: VIP/Premium users can purchase a "Dedicated Matchmaking" add-on
- FR-24: Matchmaking Staff (admin-panel role) can be internally assigned to a paying client's profile
- FR-25: Matchmaking Staff can log notes, suggest curated matches, and schedule consultation calls — all actions performed from the Admin Panel, attributed via audit log
- FR-26: Client sees their assigned matchmaker's name/photo and suggested matches on their own dashboard, but the matchmaker never has a separate client-facing "agent app" — all client communication is via in-app chat, WhatsApp, or scheduled call

### 3.6 Subscriptions & Payments
- FR-27: Plans: Free, Basic, Premium, VIP × Monthly/Quarterly/Half-Yearly/Yearly
- FR-28: Razorpay integration: UPI, cards, net banking, wallets
- FR-29: GST-compliant invoice generation (PDF, emailed)
- FR-30: Auto-renewal with reminder notifications; grace period and downgrade-on-expiry logic

### 3.7 Admin Panel
- FR-31: Dashboards: revenue, active users, new registrations, premium conversion, successful matches, subscription reports, search trends
- FR-32: User management: search, suspend, verify, impersonate-for-support (audited)
- FR-33: Matchmaking Staff console: assigned clients list, notes, suggested-match tracker (replaces the former Agent Dashboard)
- FR-34: CMS: blogs, testimonials, success stories, FAQ, banners
- FR-35: Location master data management: countries/states/cities/areas
- FR-36: Full audit log of all privileged actions

### 3.8 Notifications
- FR-37: Email (Nodemailer), WhatsApp Business API, SMS, Firebase push, in-app notification center
- FR-38: User-configurable notification preferences per channel/event

---

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Security | OWASP Top 10 mitigations, RBAC, JWT + rotated refresh tokens, rate limiting, Helmet, CORS allowlist, NoSQL injection protection, bcrypt/argon2 password hashing, audit logging, field-level encryption for sensitive PII |
| Performance | P95 API latency < 300ms for standard reads; search P95 < 800ms |
| Scalability | Stateless API tier behind a load balancer; horizontal scaling; Redis-backed session/cache; BullMQ for async jobs |
| Availability | 99.5% target uptime; graceful degradation of chat/notifications if Redis/queue is degraded |
| Accessibility | WCAG 2.1 AA target for core flows |
| Internationalization | ngx-translate scaffolding for English + at least one additional language (e.g., Urdu/Arabic RTL support) |
| Compliance | GDPR-style data export/delete on request; GST invoicing; data retention policy for deleted accounts |
| Auditability | Every admin/staff privileged action (verification, suspension, match assignment) is logged with actor, timestamp, before/after state |

---

## 5. Data Privacy & Islamic-Values Constraints
- Photos default to "connections-only" visibility, never fully public without explicit opt-in.
- Contact details are never shown until both parties accept an Interest.
- Guardian/Wali linkage is optional but, when enabled, gives the guardian visibility into incoming interests before the primary user acts on them (configurable).
- No swipe/gamified matching mechanics — search and Express Interest only, consistent with a deliberate, family-oriented process.

---

## 6. Acceptance Criteria (Sample — Registration)
- Given a new visitor, when they complete registration with a valid email and password, then a verification email/OTP is sent and the account remains in `pending_verification` state until confirmed.
- Given an unverified account, when the user attempts to message another user, then the action is blocked with a clear "verify your email" prompt.
- Given a Support Staff admin login, when they log in with valid credentials and TOTP, then they land on the Admin Panel scoped to their assigned RBAC permissions only — they never see a separate "agent" URL or app, since none exists.

---

## 7. Roles Confirmed Removed From Scope
Per explicit product decision, the following are **not** part of this build:
- Agent registration/self-signup
- Agent login page or agent-specific auth guard
- Standalone Agent Dashboard SPA/module
- Agent commission calculation UI (commission tracking, if reintroduced later, would live inside the Admin Panel as a staff performance report, not a self-service payout portal)
