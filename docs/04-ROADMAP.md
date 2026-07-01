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
| 8 | Admin Panel (includes matchmaking-staff console — replaces former "Agent Portal" phase) | Scaffolded module (`admin`), UI pending. RBAC roles (`support_staff`, `matchmaking_staff`, `admin`, `super_admin`) defined in `Role` enum; unified `/admin/login` endpoint not yet built (currently one shared `/auth/login`) |
| ~~9~~ | ~~Agent Portal~~ | **Removed from scope** |
| 9 | Matchmaking module (staff-curated suggestions, client-facing view) | Scaffolded module (`matches`), logic pending |
| 10 | Real-time chat module | Scaffolded module (`chat`), Socket.IO gateway pending |
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
7. Add profile visibility rules to `GET /profiles/:id` (currently requires auth but doesn't yet respect `privacy.hideContact`/`hidePhotos`, and isn't gated by mutual-interest/connection state).
8. Photo upload (S3) and verification document upload for profiles.
9. Implement `search` module (Atlas Search index + filters) — the next real dependency once profiles have enough data to search over.
