# System Architecture — AQD (عقد)

## 1. High-Level Architecture

```
                    ┌────────────────────┐
                    │   CloudFront CDN    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Angular 20 SPA     │  (landing, user dashboard, admin panel —
                    │   (frontend/)        │   single app, RBAC-gated routes)
                    └──────────┬──────────┘
                               │ HTTPS / REST + WebSocket
                    ┌──────────▼──────────┐
                    │   Nginx (reverse     │
                    │   proxy + SSL)       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  NestJS API (PM2,    │
                    │  horizontally        │
                    │  scaled) (backend/)  │
                    └──┬────────┬────────┬─┘
                       │        │        │
              ┌────────▼──┐ ┌───▼────┐ ┌─▼──────────┐
              │ MongoDB    │ │ Redis  │ │ BullMQ      │
              │ Atlas      │ │ (cache,│ │ workers     │
              │            │ │ sessions,│(emails,     │
              │            │ │ pub/sub)│ WhatsApp,    │
              │            │ │        │ │ payment     │
              │            │ │        │ │ webhooks)   │
              └────────────┘ └────────┘ └─────────────┘
                       │
              ┌────────▼──────────────────────────────┐
              │ External: Razorpay, WhatsApp Business  │
              │ API, Firebase FCM, S3+CloudFront,       │
              │ Google OAuth, SMTP                      │
              └──────────────────────────────────────────┘
```

There is **one** frontend application, not three. Landing pages, the authenticated user dashboard, and the Admin Panel are lazy-loaded route groups within the same Angular app, gated by route guards + RBAC. There is no separate Agent SPA or Agent subdomain, matching the removal of the agent-portal requirement.

## 2. Module Boundaries (Backend)

Each NestJS feature module owns its controller, service, schema, and DTOs, and exports only what other modules need. Modules:

| Module | Responsibility |
|---|---|
| `auth` | Registration, login (user + unified admin-panel login), OTP, refresh tokens, 2FA, RBAC guards |
| `users` | Account records, role assignment, session management |
| `profiles` | Profile CRUD, photo gallery, verification documents, privacy settings |
| `search` | Atlas Search queries, filters, radius search |
| `matches` | Interests, favorites, shortlists, block/report, staff-assigned match suggestions |
| `subscriptions` | Plan catalog, user subscription state, renewal jobs |
| `payments` | Razorpay integration, invoices, webhooks |
| `chat` | Socket.IO gateway, message persistence, read receipts, presence |
| `notifications` | Email/WhatsApp/SMS/FCM dispatch via BullMQ, in-app notification center |
| `admin` | Admin Panel-only endpoints: dashboards, user moderation, matchmaking-staff console, audit views |
| `cms` | Blogs, testimonials, success stories, FAQ, banners |
| `locations` | Country/state/city/area master data, geocoding helpers |
| `audit` | Write-only audit log service, injected into any module performing a privileged action |

No `agents` module exists. Matchmaking-staff functionality (assigning a staff member to a paying client, logging notes, suggesting matches) lives inside `admin`, guarded by the `matchmaking_staff` role — it is a capability within the Admin Panel, not an independent bounded context with its own auth flow.

## 3. Frontend Route Groups

```
/                       → landing (guest)
/auth/*                 → login, register, verify, forgot-password  (regular users only)
/app/*                  → authenticated user area (dashboard, profile, search, matches, chat, subscriptions)
/admin/*                → admin panel, single login at /admin/login
                           guarded by AdminAuthGuard checking role ∈ {support_staff, matchmaking_staff, admin, super_admin}
                           /admin/matchmaking  → matchmaking-staff console (replaces old agent dashboard)
```

There is intentionally no `/agent/*` route and no `AgentAuthGuard`.

## 4. Authentication Flow

1. **User auth**: `/auth/register` → email/OTP verification → `/auth/login` issues access (15m) + refresh (7d, httpOnly, rotated) JWTs. Optional TOTP 2FA step.
2. **Admin-panel auth**: `/admin/login` — same JWT mechanism, stricter rate limiting, mandatory 2FA for `admin`/`super_admin`, RBAC claim embedded in the access token (`role`, `permissions[]`). A `support_staff` or `matchmaking_staff` account is provisioned by a `super_admin` from within the Admin Panel — there is no public sign-up for these roles.
3. All privileged writes (verification approval, suspension, match assignment) pass through the `audit` service, recording `actorId`, `action`, `targetId`, `before`, `after`, `timestamp`.

## 5. Real-Time (Chat)

- Socket.IO gateway in `chat` module, authenticated via JWT handshake middleware.
- Redis adapter (`@socket.io/redis-adapter`) for multi-instance pub/sub so the app scales horizontally.
- Presence and typing indicators stored in Redis with short TTL; message history persisted in MongoDB.

## 6. Background Jobs (BullMQ + Redis)

| Queue | Jobs |
|---|---|
| `notifications` | email send, WhatsApp send, SMS send, FCM push |
| `subscriptions` | expiry checks, renewal reminders, downgrade-on-expiry |
| `payments` | webhook reconciliation, invoice PDF generation |
| `search-index` | Atlas Search index refresh triggers on profile update |

## 7. Security Layering

- Helmet + strict CORS allowlist at the Nginx and Nest levels.
- `@nestjs/throttler` global rate limiting, tighter limits on `/auth/*` and `/admin/login`.
- class-validator DTOs on every input boundary; Mongoose schema-level validation as a second line of defense.
- Field-level encryption (AES-256-GCM via a KMS-backed key) for sensitive PII: phone, government ID numbers.
- RBAC guard (`@Roles()` decorator + `RolesGuard`) on every Admin Panel endpoint; `matchmaking_staff` scoped strictly to assigned clients via a resource-ownership check, not just role check.

## 8. Deployment Topology

- Docker Compose for local dev: `mongo` (or Atlas), `redis`, `backend`, `frontend` (nginx-served static build).
- Production: AWS EC2 (or ECS) running the NestJS API under PM2 in cluster mode behind an ALB; Angular build served via S3 + CloudFront; MongoDB Atlas managed cluster; Redis via ElastiCache.
- GitHub Actions CI: lint → test → build → Docker image push → deploy.

## 9. Removed-Scope Note
The architecture above supersedes any prior design that included a standalone Agent Portal (separate Angular app, `agents` NestJS module, agent JWT scope, or agent subdomain). That surface has been fully removed per product decision; matchmaking operations are a capability of the Admin Panel only.
