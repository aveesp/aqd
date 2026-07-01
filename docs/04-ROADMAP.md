# Implementation Roadmap — AQD (عقد)

Agent login/portal has been removed from scope entirely (see [01-SRS.md](01-SRS.md) §1.3/§1.4/§7). Matchmaking-staff capability is folded into the Admin Panel phase instead of getting its own phase.

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Software Requirement Specification | ✅ Done — [01-SRS.md](01-SRS.md) |
| 2 | Product backlog, user stories, sprint plan | Pending |
| 3 | High-level architecture, low-level design, ER overview | ✅ Done — [02-ARCHITECTURE.md](02-ARCHITECTURE.md), [03-DATABASE-DESIGN.md](03-DATABASE-DESIGN.md) |
| 4 | MongoDB schemas, API spec, Swagger | Schemas drafted in 03; Swagger wiring pending in `backend` |
| 5 | UI wireframes, high-fidelity design, design system | Pending |
| 6 | Angular frontend scaffold | ✅ Done — `frontend/` (Angular 20, standalone, Tailwind wired) |
| 7 | NestJS backend scaffold | ✅ Done — `backend/` (all feature modules generated and wired, boots cleanly) |
| 8 | Admin Panel (includes matchmaking-staff console — replaces former "Agent Portal" phase) | Scaffolded module (`admin`), UI pending |
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
1. Wire MongoDB connection (`@nestjs/mongoose`) using schemas from [03-DATABASE-DESIGN.md](03-DATABASE-DESIGN.md).
2. Implement `auth` module: registration, OTP/email verification, JWT + refresh rotation, and the single `/admin/login` for staff roles (`support_staff`, `matchmaking_staff`, `admin`, `super_admin`) — no agent auth guard.
3. Add Swagger (`@nestjs/swagger`) bootstrap in `main.ts`.
4. Build the Angular auth flow (`features/auth`) and route guards (`core/guards`), with a distinct `AdminAuthGuard` for `/admin/*` — no `AgentAuthGuard`.
5. Stand up Docker Compose for local MongoDB + Redis so the backend can run against real dependencies instead of stubs.
