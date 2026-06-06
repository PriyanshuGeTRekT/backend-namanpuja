# Deploying Naman Puja — free on Vercel + Supabase

This deploys the whole platform on free tiers:

| Component | Host |
| --- | --- |
| Database + Auth + Storage (app **and** CRM data) | **Supabase** (one cloud project) |
| Website (`frontend-namanpuja`) | **Vercel** (Next.js) |
| Backend API (`backend-namanpuja`) | **Vercel** (serverless function) |
| Admin panel (`adminpanel-namanpuja`) | **Vercel** (static SPA) |
| Atomic CRM (`crm-namanpuja`) | **Vercel** (SPA) + **Supabase** (edge functions) |

All repo configs (`vercel.json`, serverless wrapper, build scripts) are already
committed. You only need to create the accounts and paste environment variables.

> **Free-tier notes (MVP):** Vercel Hobby is non-commercial — fine for an MVP/demo,
> move to Pro for a real commercial launch. Supabase free pauses after ~7 days idle
> (one click to resume) and is capped at 500 MB.

---

## Step 1 — Supabase project (the database for everything)

1. Go to **supabase.com → New project**. Pick a region near your users (e.g. Mumbai).
   Save the **database password** you set.
2. Open **Project Settings**:
   - **Database → Connection string**: copy both
     - **Transaction pooler** (port `6543`) → this is `DATABASE_URL`
     - **Direct connection** (port `5432`) → this is `DIRECT_URL`
   - **API keys**: copy the **Project URL**, the **publishable** key
     (`sb_publishable_…`) and the **secret** key (`sb_secret_…`).

### 1a. Create the app tables + seed content (run locally, once)

```bash
cd backend-namanpuja
# temporarily point .env at the cloud DB:
#   DATABASE_URL="postgresql://postgres:[PWD]@…pooler…:6543/postgres?pgbouncer=true&connection_limit=1"
#   DIRECT_URL="postgresql://postgres:[PWD]@…:5432/postgres"
npx prisma migrate deploy      # creates countries, cities, pujas, bookings, …
npm run db:seed                # 6 pujas, 12 cities, 24 temples, 72 SEO pages
```

### 1b. Create the CRM tables + functions (Atomic CRM)

```bash
cd ../crm-namanpuja
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push           # creates contacts, deals, sales, …
npx supabase functions deploy  # deploys the CRM edge functions
```

> The app tables (Prisma) and CRM tables (Supabase migrations) are disjoint and
> live happily in the same project — this is the shared-DB architecture.

---

## Step 2 — Backend API → Vercel (deploy this first; others need its URL)

1. **vercel.com → Add New → Project → import `backend-namanpuja`.**
2. Framework preset: **Other** (the committed `vercel.json` handles the build).
3. **Environment Variables** (Production):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | pooled string (`…:6543/postgres?pgbouncer=true&connection_limit=1`) |
   | `DIRECT_URL` | direct string (`…:5432/postgres`) |
   | `JWT_SECRET` | a long random string |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CRM_ENABLED` | `true` |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key (`sb_secret_…`) |
   | `CRM_DEFAULT_SALES_ID` | `1` |
   | `CORS_ORIGINS` | *(fill in after Step 3–5 — see Step 6)* |

4. Deploy. Note the URL, e.g. `https://backend-namanpuja.vercel.app`.
   Test: open `https://backend-namanpuja.vercel.app/health` → `{"status":"ok"}`.

---

## Step 3 — Website → Vercel

1. Import **`frontend-namanpuja`** (Vercel auto-detects Next.js).
2. Env vars:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://backend-namanpuja.vercel.app/api` |
   | `NEXT_PUBLIC_SITE_URL` | `https://namanpuja.com` (or the Vercel URL for now) |

3. Deploy → e.g. `https://namanpuja.vercel.app`.

---

## Step 4 — Admin panel → Vercel

1. Import **`adminpanel-namanpuja`** (auto-detects Vite).
2. Env var:

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://backend-namanpuja.vercel.app/api/admin` |

3. Deploy → e.g. `https://admin-namanpuja.vercel.app`.

---

## Step 5 — Atomic CRM → Vercel

1. Import **`crm-namanpuja`** (auto-detects Vite).
2. Env vars:

   | Key | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `VITE_SB_PUBLISHABLE_KEY` | the **publishable** key (`sb_publishable_…`) |
   | `VITE_INBOUND_EMAIL` | *(optional — leave default)* |
   | `VITE_ATTACHMENTS_BUCKET` | `attachments` |

3. Deploy → e.g. `https://crm-namanpuja.vercel.app`.
4. Open it once and **create the first user** → becomes CRM `sales` #1, which
   inbound bookings are assigned to.

---

## Step 6 — Wire CORS + go live

1. Back in the **backend** Vercel project, set:

   ```
   CORS_ORIGINS = https://namanpuja.com,https://www.namanpuja.com,https://namanpuja.vercel.app,https://admin-namanpuja.vercel.app
   ```
   Redeploy the backend.

2. **Custom domain** (Website project → Settings → Domains): add `namanpuja.com`
   and `www.namanpuja.com`, then point your registrar's DNS as Vercel instructs.
   Add `admin.namanpuja.com` → admin project, `crm.namanpuja.com` → CRM project.

3. **Smoke test the live flow:** open the website → book a puja → confirm it
   appears in the CRM (Contacts + Deals) and in the admin panel (Bookings).

---

## Deploy order recap

```
Supabase project ─▶ Backend (Vercel) ─▶ Website + Admin + CRM (Vercel) ─▶ set backend CORS ─▶ domain
```

Backend first (everyone needs its URL); CORS last (it needs everyone's URLs).

## Troubleshooting

- **CORS errors in the browser** → backend `CORS_ORIGINS` is missing that exact origin. Update + redeploy.
- **Prisma “engine not found” on Vercel** → ensure `binaryTargets` includes `rhel-openssl-3.0.x` (already set) and the build ran `prisma generate` (it does via `vercel-build`).
- **DB connection errors / too many connections** → `DATABASE_URL` must be the **pooled** (6543) string with `?pgbouncer=true&connection_limit=1`; migrations use `DIRECT_URL` (5432).
- **CRM bookings not syncing** → backend needs `CRM_ENABLED=true` + the correct `SUPABASE_SERVICE_ROLE_KEY` (secret), and a `sales` row must exist (Step 5.4).
- **Supabase project paused** → free tier sleeps after ~7 days idle; resume from the dashboard.
