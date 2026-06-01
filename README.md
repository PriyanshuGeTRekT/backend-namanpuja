# backend-namanpuja

REST API for [namanpuja.com](https://namanpuja.com) — powers the public website and the admin panel, and syncs bookings into **Atomic CRM**.

## Tech stack

- **Node.js + Express** (TypeScript, ES modules)
- **Prisma ORM** → **PostgreSQL** (Supabase, shared with Atomic CRM)
- **JWT** auth for the admin panel
- **Zod** validation, **Helmet**, **CORS**, rate limiting

## Architecture

```
src/
├── index.ts            # server bootstrap
├── app.ts              # express app + middleware
├── config/             # env + prisma client
├── middleware/         # auth, error handling
├── utils/              # ApiError, asyncHandler, slug helpers
├── services/crm/       # Atomic CRM (Supabase) integration
├── bookings/           # booking creation + CRM sync
├── public/             # public read API + booking endpoint (frontend)
└── admin/              # react-admin compatible CRUD API (admin panel)
prisma/
├── schema.prisma       # data model
├── seed.ts             # seeds admin, pujas, cities, temples, SEO pages
└── content/            # North-India dataset + SEO content generator
```

## Data model (high level)

`Country → City → PujaLocation` is the core **Country → City → Puja** flow.
A **PujaLocation** is the SEO landing page for a *puja × city* pair (intro,
benefits, rituals, samagri, FAQs, full meta tags — modelled on the reference
content brief). **Temple**, **Booking** and **AdminUser** round out the schema.

## Getting started

```bash
cp .env.example .env          # fill in Supabase DATABASE_URL etc.
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init   # create tables (needs DB access)
npm run db:seed               # seed pujas, cities, temples + SEO pages
npm run dev                   # http://localhost:4000
```

> No database yet? You can still `npm install` and `npm run build` to typecheck.
> Point `DATABASE_URL`/`DIRECT_URL` at a Supabase project to run migrations and seed.

## Key endpoints

### Public (`/api`)
| Method | Path | Description |
| --- | --- | --- |
| GET | `/countries` | Enabled countries (for the flow) |
| GET | `/countries/:slug/cities` | Cities in a country |
| GET | `/cities/:slug` | City + its available pujas + temples |
| GET | `/pujas` · `/pujas/:slug` | Puja catalog |
| GET | `/locations/:slug` | SEO landing page (puja × city) |
| GET | `/temples` · `/temples/:slug` | Temples |
| POST | `/bookings` | Create a booking (syncs to Atomic CRM) |

### Admin (`/api/admin`, JWT required)
`POST /auth/login`, `GET /auth/me`, and full react-admin CRUD for
`countries`, `cities`, `puja-categories`, `pujas`, `puja-locations`,
`temples`, `bookings`.

## Atomic CRM integration

When a booking is created it is mirrored into Atomic CRM as a **contact** + a
**deal** via Supabase's REST API. Configure with `CRM_ENABLED=true` and the
`SUPABASE_*` variables in `.env`. See `src/services/crm/atomicCrm.ts`.
