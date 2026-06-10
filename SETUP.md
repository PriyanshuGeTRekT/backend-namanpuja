# Running Naman Puja locally

The four apps are cloned as **siblings** in one folder:

```
namanpuja/
├── backend-namanpuja/      ← run things from here
├── frontend-namanpuja/
├── adminpanel-namanpuja/
└── crm-namanpuja/
```

## ✅ One command with Docker (recommended)

Only prerequisite: **Docker Desktop**. Everyone shares the **live cloud Supabase**
database (and the same Atomic CRM data) — no local Postgres, no migrations to run.

```bash
cd backend-namanpuja
cp .env.docker.example .env.docker     # first time only — fill in the real secrets
docker compose up --build
```

> Ask the project owner for the real `.env.docker` values (DB URL, JWT secret,
> Supabase service-role key). They're shared **privately**, never committed.

Then open:

| App | URL | Login |
| --- | --- | --- |
| Website | http://localhost:3000 | — |
| Admin panel | http://localhost:5173 | admin@namanpuja.com / ChangeMe123! |
| Atomic CRM | http://localhost:5174 | admin@namanpuja.com / *(CRM password)* |
| Backend API | http://localhost:4000 | — |

Stop with `Ctrl+C` (or `docker compose down`). Because the DB is the live cloud
Supabase, the data is always there — no seeding needed.

## ⚠️ Important

- **You're on the LIVE database.** Edits (and bookings) are real and shared by
  the whole team. Don't run destructive commands.
- **Don't run `npm run prisma:migrate`** (that's `prisma migrate dev`, which
  creates new migrations and expects a throwaway DB). The container runs
  `prisma migrate deploy` automatically, which only applies already-committed
  migrations.
- That `P1001: Can't reach database server at localhost:5433` error means you
  were pointing at a local Postgres that isn't running. With this Docker setup
  you don't use a local DB at all — just `docker compose up`.

## 🛠 Want an isolated local database instead?

If you'd rather not share the live DB, point `.env.docker` at a local Postgres
and add a `db` service back (ask the owner for the local-DB compose variant), or
run the old `start-stack.sh` which spins up a local Dockerised Postgres.
