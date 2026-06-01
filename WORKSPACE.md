# Naman Puja — namanpuja.com

Monorepo workspace for the Naman Puja platform. Each app is its own Git repo:

| Folder | Repo | Description |
| --- | --- | --- |
| `frontend-namanpuja/` | [frontend-namanpuja](https://github.com/PriyanshuGeTRekT/frontend-namanpuja) | Public website (Next.js 14, Tailwind, Framer Motion) |
| `backend-namanpuja/` | [backend-namanpuja](https://github.com/PriyanshuGeTRekT/backend-namanpuja) | REST API (Express, Prisma, Postgres) + CRM sync |
| `adminpanel-namanpuja/` | [adminpanel-namanpuja](https://github.com/PriyanshuGeTRekT/adminpanel-namanpuja) | Admin panel (react-admin) to manage pujas/locations/bookings |
| `crm-namanpuja/` | [crm-namanpuja](https://github.com/PriyanshuGeTRekT/crm-namanpuja) | Atomic CRM fork — bookings land here as contacts + deals |

## The flow

```
Customer → Website (Country → City → Puja → Book)
                │
                ▼
        Backend API  ──▶  App DB (pujas, cities, bookings)
                │
                └──────▶  Atomic CRM (Supabase): contact + deal  ──▶  Sales team
Team → Admin panel ──▶ Backend API ──▶ App DB (manage catalog & content)
```

## Run the whole stack (one command)

> Requires: **Docker Desktop**, **Node 20+**, and `npm install` already run in each
> of the four folders.

```bash
./start-stack.sh     # boots DB + Supabase + all four apps
./stop-stack.sh      # stops apps + Supabase (add --db to stop Postgres too)
```

`start-stack.sh` is idempotent — reuses existing containers, re-applies
migrations/seed safely, and auto-syncs the local Supabase key into the backend.

| Service | URL | Login |
| --- | --- | --- |
| Website | http://localhost:3000 | — |
| Admin panel | http://localhost:5173 | admin@namanpuja.com / ChangeMe123! |
| Atomic CRM | http://localhost:5174 | admin@namanpuja.com / ChangeMe123! |
| Backend API | http://localhost:4000 | — |
| Supabase Studio | http://127.0.0.1:54323 | — |

Logs stream to `./logs/`. First run pulls Docker images (Postgres + the Supabase
stack), so it takes a few minutes; subsequent runs are fast.

## First-time setup

```bash
# install deps in each app
for d in frontend-namanpuja backend-namanpuja adminpanel-namanpuja crm-namanpuja; do (cd $d && npm install); done
# then:
./start-stack.sh
# open http://localhost:5174 once to create the first CRM user (becomes sales #1)
```

## Going to production

Local dev uses a Docker Postgres (app) + Atomic CRM's local Supabase (CRM). In
production both share **one Supabase project** — see
[`backend-namanpuja/docs/atomic-crm-integration.md`](backend-namanpuja/docs/atomic-crm-integration.md).
