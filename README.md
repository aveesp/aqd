# AQD (عقد) — Where Faith Meets Commitment

Muslim Marriage Bureau Platform monorepo.

## Structure

```
akd/
├── docs/                    Requirements, architecture, DB design, roadmap
├── frontend/                Angular 20 SPA (landing + user dashboard + admin panel)
└── backend/                 NestJS API
```

## Docs
- [Software Requirement Specification](docs/01-SRS.md)
- [System Architecture](docs/02-ARCHITECTURE.md)
- [Database Design](docs/03-DATABASE-DESIGN.md)
- [Implementation Roadmap](docs/04-ROADMAP.md)

## Scope Note
There is no Agent login or Agent Portal in this platform. Matchmaking staff work through the Admin Panel under RBAC (`matchmaking_staff`, `support_staff` roles) — see [01-SRS.md §1.3/§7](docs/01-SRS.md).

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env   # fill in MongoDB Atlas URI, Redis, Razorpay, etc.
npm install
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Roles
`guest` · `user` · `premium` · `vip` · `support_staff` · `matchmaking_staff` · `admin` · `super_admin`

Regular users authenticate at `/auth/login`. All internal staff (support, matchmaking, admin, super admin) authenticate at a single `/admin/login`, differentiated by RBAC — not by separate apps or portals.
