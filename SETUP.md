# Running Naman Puja locally

The four apps are expected to be cloned as **siblings** in one folder:

```
namanpuja/
├── backend-namanpuja/      ← run things from here
├── frontend-namanpuja/
├── adminpanel-namanpuja/
└── crm-namanpuja/
```

## ✅ Easiest: one command with Docker (recommended)

The only prerequisite is **Docker Desktop**. No Node, no Postgres, no `.env`
juggling — the database is created, migrated, and seeded automatically.

```bash
cd backend-namanpuja
docker compose up --build
```

That's it. Wait ~1–2 minutes the first time (it builds images + seeds), then:

| App | URL | Login |
| --- | --- | --- |
| Website | http://localhost:3000 | — |
| Admin panel | http://localhost:5173 | admin@namanpuja.com / ChangeMe123! |
| Backend API | http://localhost:4000 | — |
| Postgres | localhost:5433 | naman / naman |

Stop with `Ctrl+C`, or `docker compose down` (add `-v` to also wipe the DB).

> The **Atomic CRM** isn't in this compose — it needs its own Supabase stack.
> Run it separately (see `docs/atomic-crm-integration.md`), or use the deployed
> one at https://crm-namanpuja.vercel.app.

## 🛠 Alternative: run on the host with Node

If you prefer running the apps natively (Node 20+ and Docker for Postgres):

```bash
# 1. database
docker run -d --name namanpuja-db \
  -e POSTGRES_USER=naman -e POSTGRES_PASSWORD=naman -e POSTGRES_DB=namanpuja \
  -p 5433:5432 postgres:16-alpine

# 2. backend  (.env → DATABASE_URL / DIRECT_URL = postgresql://naman:naman@localhost:5433/namanpuja)
cd backend-namanpuja && npm install && npx prisma migrate deploy && npm run db:seed && npm run dev

# 3. website   (in another terminal)
cd frontend-namanpuja && npm install && npm run dev

# 4. admin     (in another terminal)
cd adminpanel-namanpuja && npm install && npm run dev
```

## ⚠️ Common mistake

Don't copy `.env.example` and leave the **placeholders** in — values like
`[PASSWORD]` and `[PROJECT_REF]` are not real. With Docker compose you don't
touch `.env` at all; the compose file sets everything for you.
