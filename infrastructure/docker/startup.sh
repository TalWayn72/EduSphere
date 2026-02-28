#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# EduSphere Single Container Startup Script
# Starts PostgreSQL first for init, then hands off to supervisord
# ═══════════════════════════════════════════════════════════════

set -e

echo "════════════════════════════════════════════════════════════"
echo "🚀 Starting EduSphere All-in-One Container"
echo "════════════════════════════════════════════════════════════"

# ─── Log directories ─────────────────────────────────────────
mkdir -p /var/log/postgresql /var/log/redis /var/log/nats /var/log/minio \
         /var/log/keycloak /var/log/ollama /var/log/edusphere /var/log/supervisor
chown -R postgres:postgres /var/log/postgresql
chmod -R 755 /var/log
echo "📁 Log directories created"

# ─── PostgreSQL constants ─────────────────────────────────────
PG_VER="17"
PG_DATA="/var/lib/postgresql/${PG_VER}/main"
PG_CTL="/usr/lib/postgresql/${PG_VER}/bin/pg_ctl"
PG_BIN="/usr/lib/postgresql/${PG_VER}/bin"
# Ubuntu PG package stores config in /etc, not in data dir
PG_CONF="/etc/postgresql/${PG_VER}/main/postgresql.conf"

# ─── Initialize data dir if empty (empty Docker volume on first run) ─
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
    echo "🗄️  Initializing PostgreSQL ${PG_VER} data directory..."
    install -d -o postgres -g postgres "$PG_DATA"
    su - postgres -c "$PG_BIN/initdb -D $PG_DATA --encoding=UTF8 --locale=C.UTF-8"
    echo "✅ Data directory initialized"
fi

# ─── Start PostgreSQL (Ubuntu-style: config file in /etc) ────
echo "⏳ Starting PostgreSQL for initialization..."
su - postgres -c "$PG_CTL -D $PG_DATA \
    -o \"-c config_file=$PG_CONF\" \
    -l /var/log/postgresql/init.log start"

# ─── Wait for connections ─────────────────────────────────────
echo "⏳ Waiting for PostgreSQL to accept connections..."
for i in $(seq 1 30); do
    if su - postgres -c "pg_isready -h localhost -p 5432" > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready (attempt $i)"
        break
    fi
    if [ "$i" = "30" ]; then
        echo "❌ PostgreSQL failed to start after 60 seconds"
        echo "--- init.log ---"
        cat /var/log/postgresql/init.log 2>/dev/null || true
        exit 1
    fi
    sleep 2
done

# ─── Idempotent DB + extension setup ─────────────────────────
echo "🔑 Setting up databases and extensions..."

su - postgres -c "psql -tc \"SELECT 1 FROM pg_user WHERE usename='edusphere'\" | grep -q 1 \
    || psql -c \"CREATE USER edusphere WITH SUPERUSER PASSWORD 'edusphere_dev_password';\""

su - postgres -c "psql -lqt | cut -d '|' -f 1 | grep -qw edusphere \
    || createdb -O edusphere edusphere"

su - postgres -c "psql -lqt | cut -d '|' -f 1 | grep -qw keycloak \
    || createdb -O edusphere keycloak"

su - postgres -c "psql -d edusphere -c \"\
    CREATE EXTENSION IF NOT EXISTS \\\"uuid-ossp\\\";\
    CREATE EXTENSION IF NOT EXISTS \\\"pgcrypto\\\";\
    CREATE EXTENSION IF NOT EXISTS \\\"vector\\\";\
    CREATE EXTENSION IF NOT EXISTS \\\"age\\\";\
\""

# Initialize Apache AGE graph (idempotent)
su - postgres -c "psql -d edusphere <<'PGSQL'
LOAD 'age';
SET search_path = ag_catalog, public;
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ag_graph WHERE name = 'edusphere_graph') THEN
        PERFORM create_graph('edusphere_graph');
    END IF;
END;
\$\$;
PGSQL" 2>/dev/null || echo "⚠️  Graph init will retry on first use"

echo "✅ Database setup complete"

# ─── Run Drizzle migrations (idempotent) ─────────────────────
echo "🔄 Running database migrations..."
DB_URL="postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere"
cd /app/packages/db && DATABASE_URL="$DB_URL" node_modules/.bin/tsx src/migrate.ts 2>&1 \
    && echo "✅ Migrations complete" \
    || echo "⚠️  Migration warning (may already be applied)"

# ─── Seed if tables are empty ────────────────────────────────
USER_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "🌱 Seeding database with demo data..."
    cd /app/packages/db && DATABASE_URL="$DB_URL" node_modules/.bin/tsx src/seed.ts 2>&1 \
        && echo "✅ Seed complete" \
        || echo "⚠️  Seed warning"
else
    echo "✅ Database already seeded ($USER_COUNT users)"
fi

# ─── Stop PG — supervisord will restart it ───────────────────
echo "⏹️  Stopping PostgreSQL (supervisord will take over)..."
su - postgres -c "$PG_CTL -D $PG_DATA stop -m fast" || true

# ─── Hoist pnpm packages required by compiled dist ───────────
# prom-client is used by packages/db/dist/rls/withTenantContext.js for RLS metrics.
# nats is used by subgraphs that have NATS JetStream integration.
# pnpm's hoisting may not place these at the top-level; ensure they are accessible.
echo "🔗 Ensuring required packages are hoisted..."

if [ ! -d "/app/node_modules/prom-client" ]; then
    PROM_PATH=$(find /app/node_modules/.pnpm -maxdepth 4 -type d -name "prom-client" 2>/dev/null | head -1)
    if [ -n "$PROM_PATH" ]; then
        ln -sf "$PROM_PATH" /app/node_modules/prom-client
        echo "✅ prom-client symlinked"
    else
        echo "⚠️  prom-client not found in pnpm store — subgraphs may fail to start"
    fi
else
    echo "✅ prom-client already present"
fi

if [ ! -d "/app/node_modules/nats" ]; then
    NATS_PATH=$(find /app/node_modules/.pnpm -maxdepth 4 -type d -name "nats" 2>/dev/null | head -1)
    if [ -n "$NATS_PATH" ]; then
        ln -sf "$NATS_PATH" /app/node_modules/nats
        echo "✅ nats symlinked"
    else
        echo "⚠️  nats not found in pnpm store"
    fi
else
    echo "✅ nats already present"
fi

# ─── Conditional dist rebuild (idempotent, runs only when stale) ──
# Detects if the compiled dist files predate critical source fixes and rebuilds.
# This handles the case where the Docker image was built before source fixes were
# committed — avoids requiring a full image rebuild in corporate-proxy environments.
export PATH="/opt/nodejs/bin:$PATH"

# packages/db: check for sql.raw() RLS fix (SET LOCAL requires literal values)
# If missing, rebuild the package — it has no problematic ESM/workspace dependencies.
if ! grep -q "sql\.raw" /app/packages/db/dist/rls/withTenantContext.js 2>/dev/null; then
    echo "⚠️  packages/db dist is stale (missing sql.raw() RLS fix) — rebuilding..."
    mkdir -p /var/log/edusphere
    cd /app && pnpm turbo build --filter='./packages/db' > /var/log/edusphere/db-build.log 2>&1 \
        && echo "✅ packages/db rebuilt" \
        || echo "⚠️  packages/db rebuild failed — see /var/log/edusphere/db-build.log"
else
    echo "✅ packages/db dist is up-to-date"
fi

# subgraph-core user.graphql: verify UserPreferences type is present.
# The correct user.graphql (with UserPreferences + preferences: UserPreferences! on User)
# is provided via docker-compose volume mount from the host source tree.
# This check is informational only — no rebuild needed when mount is active.
if grep -q "UserPreferences" /app/apps/subgraph-core/dist/user/user.graphql 2>/dev/null; then
    echo "✅ subgraph-core user.graphql has UserPreferences"
else
    echo "⚠️  subgraph-core user.graphql missing UserPreferences — docker-compose volume mount may not be active"
fi

# ─── Hand off to supervisord ─────────────────────────────────
echo "🎯 Starting all services via Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/edusphere.conf
