# Atomic CRM integration

Bookings made on namanpuja.com are mirrored into **Atomic CRM**
([marmelab/atomic-crm](https://github.com/marmelab/atomic-crm)) as a **contact**
+ a **deal**, so the sales team manages every enquiry in the CRM pipeline.

```
Website / API  ──POST /api/bookings──▶  backend  ──┬─▶  app DB (bookings table)
                                                   └─▶  Atomic CRM (Supabase): contacts + deals
```

The sync code lives in [`src/services/crm/atomicCrm.ts`](../src/services/crm/atomicCrm.ts)
and is called from [`src/bookings/createBooking.ts`](../src/bookings/createBooking.ts).
A failed CRM sync never blocks a booking — the booking is still saved, and the
`crmContactId` / `crmDealId` / `crmSyncedAt` columns are left null for retry.

## Field mapping

| Booking | Atomic CRM |
| --- | --- |
| customerName | `contacts.first_name` + `last_name` |
| customerEmail | `contacts.email_jsonb` → `[{ type, email }]` |
| customerPhone | `contacts.phone_jsonb` → `[{ type, number }]` |
| — | `contacts.status` = `hot`, `sales_id` = `CRM_DEFAULT_SALES_ID` |
| puja + city | `deals.name` (e.g. "Satyanarayan Puja — Varanasi") |
| serviceType | `deals.category` |
| amount (puja price) | `deals.amount` |
| reference/notes/date | `deals.description` |
| contact | `deals.contact_ids` = `[contactId]`, `deals.stage` = `opportunity` |

## Local setup (already done in this workspace)

Atomic CRM is cloned at `../crm-namanpuja` and runs on its bundled local
Supabase stack.

```bash
# 1. Start Atomic CRM's local Supabase (Postgres + Auth + PostgREST + Studio)
cd ../crm-namanpuja
npx supabase start            # prints the Project URL + Secret key

# 2. Run the CRM app (5173 is taken by our admin panel, so use 5174)
npm run dev -- --port 5174    # http://localhost:5174

# 3. Open http://localhost:5174 and create the first user — this becomes
#    sales_id = 1, which inbound bookings are assigned to.
```

Then enable the sync in **backend `.env`**:

```env
CRM_ENABLED=true
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<the "Secret" key from `npx supabase status`>
CRM_DEFAULT_SALES_ID=1
```

Restart the backend, then submit a booking — it appears in CRM ▸ Contacts and
in the Deals pipeline.

### Useful local URLs

| | URL |
| --- | --- |
| Atomic CRM app | http://localhost:5174 |
| Supabase Studio (DB browser) | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| Mailpit (auth emails) | http://127.0.0.1:54324 |

## Production (shared Supabase)

In production the backend, Atomic CRM **and** the platform data share **one**
Supabase project (per the chosen architecture):

1. Create a Supabase project.
2. Point the backend `DATABASE_URL` / `DIRECT_URL` at it and run
   `npm run prisma:migrate && npm run db:seed`.
3. Deploy Atomic CRM to the same project (`make prod-deploy` in `crm-namanpuja`).
4. Set `CRM_ENABLED=true` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
   (the project's service-role / secret key) in the backend environment.

> The `sb_secret_…` value is a **secret** — never commit it. It lives only in
> `.env` (gitignored) and your deployment's secret store.
