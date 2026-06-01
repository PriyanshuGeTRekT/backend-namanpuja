#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# namanpuja.com — start the whole local stack with one command.
#
#   ./start-stack.sh
#
# Brings up:
#   1. App database      — Postgres in Docker (namanpuja-db, :5433)
#   2. CRM database      — Atomic CRM's local Supabase stack (:54321)
#   3. Backend API       — :4000   (CRM sync auto-configured)
#   4. Website           — :3000
#   5. Admin panel       — :5173
#   6. Atomic CRM app    — :5174
#
# Re-runnable: existing containers are reused, migrations/seed are idempotent.
# Logs stream to ./logs/. Stop everything with ./stop-stack.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# Resolve the workspace root: nearest dir (from the script, then cwd) that
# contains all four app folders — so it works wherever the script lives.
find_root() {
  local d
  for d in "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" "$PWD"; do
    while [ "$d" != "/" ]; do
      if [ -d "$d/backend-namanpuja" ] && [ -d "$d/crm-namanpuja" ]; then echo "$d"; return; fi
      d="$(dirname "$d")"
    done
  done
  echo "$PWD"
}
ROOT="$(find_root)"
cd "$ROOT"
mkdir -p logs

# Brand colours
G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; NC='\033[0m'
say() { echo -e "${B}▶${NC} $*"; }
ok()  { echo -e "${G}✔${NC} $*"; }
warn(){ echo -e "${Y}!${NC} $*"; }

DB_CONTAINER="namanpuja-db"
DB_PORT=5433

wait_for() { # wait_for <name> <command...>
  local name="$1"; shift
  for _ in $(seq 1 60); do
    if "$@" >/dev/null 2>&1; then ok "$name ready"; return 0; fi
    sleep 2
  done
  echo -e "${R}x timed out waiting for $name${NC}"; return 1
}

# ── 0. Docker ──────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  say "Starting Docker Desktop…"
  open -a Docker 2>/dev/null || true
  wait_for "Docker" docker info
fi
ok "Docker is running"

# ── 1. App database (Postgres in Docker) ───────────────────
if docker ps -a --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  docker start "$DB_CONTAINER" >/dev/null
  ok "App DB container started ($DB_CONTAINER)"
else
  say "Creating app DB container…"
  docker run -d --name "$DB_CONTAINER" \
    -e POSTGRES_USER=naman -e POSTGRES_PASSWORD=naman -e POSTGRES_DB=namanpuja \
    -p ${DB_PORT}:5432 postgres:16-alpine >/dev/null
  ok "App DB container created"
fi
wait_for "App DB" docker exec "$DB_CONTAINER" pg_isready -U naman

# ── 2. CRM database (Atomic CRM local Supabase) ────────────
say "Starting Atomic CRM's local Supabase (first run pulls Docker images)…"
( cd crm-namanpuja && npx supabase start >/dev/null 2>&1 || true )
wait_for "Supabase API" curl -sf -o /dev/null http://127.0.0.1:54321/rest/v1/

# Auto-sync the Supabase secret key into the backend .env so CRM sync works.
SECRET="$(cd crm-namanpuja && npx supabase status 2>/dev/null | grep -oE 'sb_secret_[A-Za-z0-9_-]+' | head -1 || true)"
if [ -n "$SECRET" ] && [ -f backend-namanpuja/.env ]; then
  if grep -q '^SUPABASE_SERVICE_ROLE_KEY=' backend-namanpuja/.env; then
    # macOS/BSD sed in-place
    sed -i '' "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SECRET|" backend-namanpuja/.env
  fi
  ok "Synced Supabase secret key into backend/.env"
else
  warn "Could not auto-detect Supabase secret key — check backend/.env manually"
fi

# ── 3. Backend migrations + seed (idempotent) ──────────────
say "Applying DB migrations + seed…"
( cd backend-namanpuja && npx prisma migrate deploy >/dev/null 2>&1 && npm run db:seed >/dev/null 2>&1 ) \
  && ok "Database migrated + seeded" || warn "migrate/seed step had warnings (see logs)"

# ── 4. Launch the apps ─────────────────────────────────────
start_app() { # start_app <name> <dir> <port> <cmd...>
  local name="$1" dir="$2" port="$3"; shift 3
  if lsof -ti:"$port" >/dev/null 2>&1; then
    warn "$name already running on :$port — leaving it"
    return
  fi
  say "Starting $name on :$port…"
  ( cd "$dir" && nohup "$@" >"$ROOT/logs/$name.log" 2>&1 & echo $! > "$ROOT/logs/$name.pid" )
}

start_app backend  backend-namanpuja   4000 npm run dev
start_app web      frontend-namanpuja  3000 npm run dev
start_app admin    adminpanel-namanpuja 5173 npm run dev
start_app crm      crm-namanpuja       5174 npm run dev -- --port 5174

wait_for "Backend"     curl -sf -o /dev/null http://localhost:4000/health
wait_for "Website"     curl -sf -o /dev/null http://localhost:3000
wait_for "Admin panel" curl -sf -o /dev/null http://localhost:5173
wait_for "Atomic CRM"  curl -sf -o /dev/null http://localhost:5174

echo ""
ok "Naman Puja stack is up 🪔"
cat <<EOF

  Website        http://localhost:3000
  Admin panel    http://localhost:5173      (admin@namanpuja.com / ChangeMe123!)
  Atomic CRM     http://localhost:5174      (admin@namanpuja.com / ChangeMe123!)
  Backend API    http://localhost:4000
  Supabase Studio http://127.0.0.1:54323

  Logs:  tail -f logs/*.log
  Stop:  ./stop-stack.sh
EOF
