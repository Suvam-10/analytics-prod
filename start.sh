#!/bin/sh
set -e

# defaults
MAX_RETRIES=${MAX_RETRIES:-60}
SLEEP_SEC=${SLEEP_SEC:-2}
PORT=${PORT:-8080}
MIGRATE_ON_START=${MIGRATE_ON_START:-true}

echo "Start script: NODE_ENV=${NODE_ENV:-production} PORT=${PORT} MIGRATE_ON_START=${MIGRATE_ON_START}"

wait_for_postgres() {
  # DATABASE_URL expected in form: postgres://user:pass@host:port/dbname
  if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not set, skipping Postgres wait"
    return 0
  fi

  # extract host and port
  # remove protocol
  hostport=$(echo "$DATABASE_URL" | awk -F@ '{print $2}' | awk -F/ '{print $1}')
  DB_HOST=$(echo "$hostport" | cut -d: -f1)
  DB_PORT=$(echo "$hostport" | cut -d: -f2)

  if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
    echo "Could not parse DB_HOST/DB_PORT from DATABASE_URL ($DATABASE_URL) — continuing without wait"
    return 0
  fi

  echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
  tries=0
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; do
    tries=$((tries+1))
    echo "Postgres not ready ($tries/$MAX_RETRIES). Sleeping ${SLEEP_SEC}s..."
    if [ "$tries" -ge "$MAX_RETRIES" ]; then
      echo "Timed out waiting for Postgres after $tries tries — continuing"
      return 1
    fi
    sleep "$SLEEP_SEC"
  done
  echo "Postgres is ready"
  return 0
}

# Wait for postgres (best-effort)
wait_for_postgres || true

# Optional migrations
if [ "$MIGRATE_ON_START" = "true" ] || [ "$MIGRATE_ON_START" = "1" ]; then
  echo "Running migrations (MIGRATE_ON_START=$MIGRATE_ON_START)..."
  # adjust command to your migration tool (knex example)
  if command -v npx >/dev/null 2>&1; then
    npx knex --knexfile src/db/knexfile.js migrate:latest || echo "Migration command failed but continuing"
  else
    echo "npx not found; skipping migrations"
  fi
else
  echo "MIGRATE_ON_START is false — skipping migrations"
fi

echo "Starting server (exec) on port $PORT"
# Replace this with your actual start command if different
# Use exec so the Node process receives signals directly from Docker
exec npm run start











