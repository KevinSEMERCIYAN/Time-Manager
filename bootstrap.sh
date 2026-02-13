#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="dev"
BUILD="1"
RUN_MIGRATIONS="1"
REMOVE_ORPHANS="1"

usage() {
  cat <<'USAGE'
TimeManager bootstrap

Usage:
  ./bootstrap.sh [--dev|--prod] [--no-build] [--no-migrate] [--no-remove-orphans]

Options:
  --dev                 Start development stack (default)
  --prod                Start production stack
  --no-build            Skip docker compose build
  --no-migrate          Skip prisma migrate deploy
  --no-remove-orphans   Do not pass --remove-orphans on up
  -h, --help            Show this help

Examples:
  ./bootstrap.sh --dev
  ./bootstrap.sh --prod
  ./bootstrap.sh --prod --no-build
USAGE
}

log() {
  printf '[bootstrap] %s\n' "$*"
}

fail() {
  printf '[bootstrap][error] %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      MODE="dev"
      ;;
    --prod)
      MODE="prod"
      ;;
    --no-build)
      BUILD="0"
      ;;
    --no-migrate)
      RUN_MIGRATIONS="0"
      ;;
    --no-remove-orphans)
      REMOVE_ORPHANS="0"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
  shift
done

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is not available"

cd "$ROOT_DIR"

[[ -f "compose.yml" ]] || fail "compose.yml not found in $ROOT_DIR"
[[ -f "compose.prod.yml" ]] || fail "compose.prod.yml not found in $ROOT_DIR"
[[ -f "backend/prisma/schema.prisma" ]] || fail "backend/prisma/schema.prisma not found"
[[ -f "nginx/conf.d/app.conf" ]] || fail "nginx/conf.d/app.conf not found"
[[ -f "nginx/conf.d/app.prod.conf.disabled" ]] || fail "nginx/conf.d/app.prod.conf.disabled not found"

if [[ ! -f ".env" ]]; then
  log "No .env found. Creating a minimal .env from local defaults."
  cat > .env <<'ENVFILE'
LDAP_BIND_PASSWORD=change-me
JWT_SECRET=change-me
ENVFILE
fi

if [[ "$MODE" == "dev" ]]; then
  COMPOSE_FILE="compose.yml"
  PROJECT="timemanager-dev"
  STACK_NAME="development"
else
  COMPOSE_FILE="compose.prod.yml"
  PROJECT="timemanager-prod"
  STACK_NAME="production"

  [[ -d "certs" ]] || fail "certs directory is missing for production"
  [[ -f "certs/timemanager.crt" ]] || fail "Missing certs/timemanager.crt for production"
  [[ -f "certs/timemanager.key" ]] || fail "Missing certs/timemanager.key for production"
fi

BASE_CMD=(docker compose -p "$PROJECT" -f "$COMPOSE_FILE")

log "Starting $STACK_NAME stack from $COMPOSE_FILE"

if [[ "$BUILD" == "1" ]]; then
  log "Building images"
  "${BASE_CMD[@]}" build
fi

UP_ARGS=(up -d)
if [[ "$REMOVE_ORPHANS" == "1" ]]; then
  UP_ARGS+=(--remove-orphans)
fi

log "Starting containers"
"${BASE_CMD[@]}" "${UP_ARGS[@]}"

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  log "Running prisma migrations"
  "${BASE_CMD[@]}" exec backend npx prisma migrate deploy
fi

log "Current status"
"${BASE_CMD[@]}" ps

if [[ "$MODE" == "dev" ]]; then
  cat <<'ENDMSG'

TimeManager dev is running.
- App:      http://localhost:8080
- Mailpit:  http://localhost:8025

Useful commands:
- Logs:     docker compose -p timemanager-dev -f compose.yml logs -f
- Stop:     docker compose -p timemanager-dev -f compose.yml down
ENDMSG
else
  cat <<'ENDMSG'

TimeManager prod is running.
- HTTP:     http://localhost
- HTTPS:    https://localhost

Useful commands:
- Logs:     docker compose -p timemanager-prod -f compose.prod.yml logs -f
- Stop:     docker compose -p timemanager-prod -f compose.prod.yml down
ENDMSG
fi
