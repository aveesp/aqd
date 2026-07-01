# Implementation Roadmap — AQD (عقد)

Agent login/portal has been removed from scope entirely (see [01-SRS.md](01-SRS.md) §1.3/§1.4/§7). Matchmaking-staff capability is folded into the Admin Panel phase instead of getting its own phase.

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Software Requirement Specification | ✅ Done — [01-SRS.md](01-SRS.md) |
| 2 | Product backlog, user stories, sprint plan | Pending |
| 3 | High-level architecture, low-level design, ER overview | ✅ Done — [02-ARCHITECTURE.md](02-ARCHITECTURE.md), [03-DATABASE-DESIGN.md](03-DATABASE-DESIGN.md) |
| 4 | MongoDB schemas, API spec, Swagger | ✅ `User` and `Profile` schemas implemented + connected; Swagger live at `/api/docs`. Remaining schemas (matches, subscriptions, chat, etc.) still to implement |
| 5 | UI wireframes, high-fidelity design, design system | Pending |
| 6 | Angular frontend scaffold | ✅ Done — `frontend/` (Angular 20, standalone, Tailwind wired) |
| 7 | NestJS backend scaffold | ✅ Done — `backend/` (all feature modules generated and wired, boots cleanly) |
| 7.5 | Auth: register/login/JWT+refresh rotation/RBAC guards | ✅ Done — `backend/src/auth`, verified end-to-end against local MongoDB (register, duplicate-email rejection, login, protected route, refresh rotation, logout, privilege-escalation-via-DTO rejection) |
| 7.6 | Profile module: schema + CRUD | ✅ Done — `backend/src/profiles` (create/get/update own profile, privacy settings, completeness scoring). Verified end-to-end including partial-update section merging (a known pitfall where class-transformer's `undefined` own-properties on nested DTOs were silently wiping sibling fields on PATCH — fixed and regression-tested) |
| 7.7 | Profile visibility rules on `GET /profiles/:id` | ✅ Done — owner and admin-panel staff (`support_staff`/`matchmaking_staff`/`admin`/`super_admin`) get the full document; other viewers get `assignedStaffId`, `privacy`, and `location.geo` stripped. Verified with a two-user + one-staff end-to-end test. `hideContact`/`hidePhotos` toggles have no dedicated fields to enforce yet (no contact/photo data modeled on `Profile`) — revisit once those land |
| 8 | Admin Panel (includes matchmaking-staff console — replaces former "Agent Portal" phase) | Scaffolded module (`admin`), UI pending. RBAC roles (`support_staff`, `matchmaking_staff`, `admin`, `super_admin`) defined in `Role` enum; unified `/admin/login` endpoint not yet built (currently one shared `/auth/login`) |
| ~~9~~ | ~~Agent Portal~~ | **Removed from scope** |
| 8.5 | Search module: filtered profile search | ✅ Done — `backend/src/search`, `GET /search/profiles` with gender/age/height/marital-status/sect/maslak/education/location/verified-only filters, pagination, self-exclusion, and the same privacy redaction as `GET /profiles/:id`. Uses standard Mongoose queries against indexed fields rather than MongoDB Atlas Search (Atlas Search is an Atlas-only Lucene feature unavailable on local `mongod`/self-hosted deployments — worth revisiting for full-text relevance ranking once the project is deployed on Atlas) |
| 8.6 | User-driven interactions: express interest, favorites, shortlist, block | ✅ Done — `backend/src/matches` (`Interest`/`Favorite`/`Shortlist`/`Block` schemas, `/matches/*` routes). Express-interest requires mutual non-blocking and rejects self-targeting/duplicate/nonexistent-user requests; accept/decline is recipient-only and one-shot; block is symmetric-checked (either party having blocked the other stops new interests). Verified end-to-end including the 403/404/409/400 edge cases. **Report** (SRS FR-18's "Report" action) is deliberately deferred — it implies an admin moderation queue, which belongs with the Admin Panel phase, not this module |
| 9 | Matchmaking module (staff-curated match suggestions, `assignedStaffId` workflow) | Not started. This is distinct from 8.6 above — it's the paid, staff-fulfilled matchmaking service (SRS §3.5), where `matchmaking_staff` suggests profiles to a client from the Admin Panel. Depends on the Admin Panel (phase 8) existing first |
| 10 | Real-time chat module | ✅ Done — `backend/src/chat` (`Chat`/`Message` schemas, REST endpoints for send/list-conversations/message-history/mark-read, plus a Socket.IO gateway at `/chat` namespace with JWT handshake auth, room-per-user delivery, and a `typing` indicator). Messaging is gated behind a mutually-accepted `Interest` (SRS FR-20) and blocked if either party has blocked the other. Verified end-to-end via REST (gating, pagination, unread counts, 403 for non-participants) and a real `socket.io-client` test (JWT-rejected connections get force-disconnected, `sendMessage` delivers to both participants' rooms, `typing` relays only between users with an accepted interest). Only text messages — image/voice/document attachments need S3 upload, not yet wired. No Redis adapter yet (single-instance only; fine for now, becomes necessary once the API scales horizontally) |
| 11 | Payment module (Razorpay, invoices) | Scaffolded module (`payments`), integration pending |
| 12 | WhatsApp integration | Scaffolded module (`notifications`), provider wiring pending |
| 13 | Testing & QA (Jest, Supertest, Cypress/Playwright) | Pending |
| 14 | Dockerization | Pending |
| 15 | CI/CD (GitHub Actions) | Pending |
| 16 | Production deployment (AWS) | Pending |
| 17 | User documentation | Pending |
| 18 | Admin documentation | Pending |

## Immediate Next Steps
1. ~~Wire MongoDB connection~~ ✅ Done (`MongooseModule.forRootAsync`, `User` schema, local `mongod` for dev).
2. ~~Implement core `auth` module~~ ✅ Done (register, login, JWT access+refresh with rotation, RolesGuard, CurrentUser decorator). Still missing: OTP/email verification step, 2FA, and a dedicated `/admin/login` endpoint separate from the general `/auth/login` (currently staff would log in through the same endpoint; the RBAC guard/role check exists but the SRS calls for a distinct admin-panel login route).
3. ~~Add Swagger~~ ✅ Done — live at `/api/docs`.
4. Build the Angular auth flow (`features/auth`) and route guards (`core/guards`), with a distinct `AdminAuthGuard` for `/admin/*` — no `AgentAuthGuard`.
5. Stand up Docker Compose for local MongoDB + Redis so the backend doesn't depend on a manually-started local `mongod`.
6. ~~Implement the `profiles` module~~ ✅ Done.
7. ~~Add profile visibility rules to `GET /profiles/:id`~~ ✅ Done (staff assignment, privacy settings, and precise geolocation redacted for non-owner/non-staff viewers).
8. Photo upload (S3) and verification document upload for profiles — will extend the visibility-redaction logic once photos exist.
9. ~~Implement `search` module~~ ✅ Done (standard Mongoose filtering; see 8.5 above for the Atlas Search caveat).
10. ~~Implement user-driven interactions (interests/favorites/shortlist/block)~~ ✅ Done (see 8.6 above).
11. ~~Real-time chat module~~ ✅ Done (see phase 10 above).
12. Admin Panel (dedicated `/admin/login`, user/profile moderation, CMS) — needed before the staff-curated matchmaking module (phase 9) can be built. Also the natural place to build photo/document verification review, since that's an admin-reviewed workflow.
13. Payment module (Razorpay) + subscription enforcement — plan tier currently isn't checked anywhere (e.g. free-tier contact/message limits from the SRS aren't enforced).
