#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# namanpuja.com — stop the whole local stack.
#
#   ./stop-stack.sh              # stop apps + Supabase, keep databases' data
#   ./stop-stack.sh --db         # also stop the app Postgres container
#
# Data is preserved (Supabase + Postgres volumes persist). Use start-stack.sh
# to bring everything back.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

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

G='\033[0;32m'; B='\033[0;34m'; NC='\033[0m'
say() { echo -e "${B}▶${NC} $*"; }
ok()  { echo -e "${G}✔${NC} $*"; }

# ── Stop the four app dev servers (by port) ────────────────
for entry in "backend:4000" "web:3000" "admin:5173" "crm:5174"; do
  name="${entry%%:*}"; port="${entry##*:}"
  pids="$(lsof -ti:"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    ok "Stopped $name (:$port)"
  fi
  rm -f "logs/$name.pid" 2>/dev/null || true
done

# ── Stop Atomic CRM's local Supabase ───────────────────────
say "Stopping local Supabase…"
( cd crm-namanpuja && npx supabase stop >/dev/null 2>&1 || true )
ok "Supabase stopped (data preserved)"

# ── Optionally stop the app Postgres container ─────────────
if [ "${1:-}" = "--db" ]; then
  docker stop namanpuja-db >/dev/null 2>&1 && ok "App DB container stopped" || true
else
  echo "  (app Postgres 'namanpuja-db' left running — pass --db to stop it too)"
fi

echo ""
ok "Stack stopped."
