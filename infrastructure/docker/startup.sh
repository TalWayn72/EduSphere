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
PG_VER="18"
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

# ─── Keycloak realm file: ensure correct name (edusphere-realm.json) ──────────
# Keycloak ≥ 24 requires the import file name to match the realm name.
# edusphere-realm.json is bind-mounted from infrastructure/docker/keycloak-realm.json.
# That bind mount has the correct user IDs (00000000-...001-5) matching DB seed.
# If the volume-initialized keycloak-realm.json also exists, remove it to avoid
# Keycloak seeing two realm files and potentially importing the wrong one.
KC_IMPORT_DIR="/opt/keycloak/data/import"
mkdir -p "$KC_IMPORT_DIR"
if [ -f "$KC_IMPORT_DIR/keycloak-realm.json" ] && [ -f "$KC_IMPORT_DIR/edusphere-realm.json" ]; then
    rm "$KC_IMPORT_DIR/keycloak-realm.json"
    echo "✅ Removed stale keycloak-realm.json (edusphere-realm.json bind-mount is authoritative)"
elif [ -f "$KC_IMPORT_DIR/keycloak-realm.json" ] && [ ! -f "$KC_IMPORT_DIR/edusphere-realm.json" ]; then
    echo "🔑 Renaming keycloak-realm.json → edusphere-realm.json (Keycloak name convention fix)"
    cp "$KC_IMPORT_DIR/keycloak-realm.json" "$KC_IMPORT_DIR/edusphere-realm.json"
    rm "$KC_IMPORT_DIR/keycloak-realm.json"
    echo "✅ Keycloak realm file renamed"
elif [ -f "$KC_IMPORT_DIR/edusphere-realm.json" ]; then
    echo "✅ edusphere-realm.json present (bind-mounted)"
fi

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

# @edusphere/langgraph-workflows: pnpm workspace symlink not created by install
# (langgraph-workflows is not directly in app's node_modules top-level).
# Needed by subgraph-agent to load compiled tutorWorkflow.js.
if [ ! -L "/app/node_modules/@edusphere/langgraph-workflows" ] && [ ! -d "/app/node_modules/@edusphere/langgraph-workflows" ]; then
    mkdir -p /app/node_modules/@edusphere
    ln -sf /app/packages/langgraph-workflows /app/node_modules/@edusphere/langgraph-workflows
    echo "✅ @edusphere/langgraph-workflows symlinked"
else
    echo "✅ @edusphere/langgraph-workflows already present"
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

# subgraph-core SDL fix: copy fixed src/*.graphql files over the dist/*.graphql files.
# src/ is bind-mounted from host with @requiresRole removed from @link imports (invalid federation import)
# and directive @requiresRole defined locally. dist/ still has old baked-in SDL files.
# typePaths: ['./**/*.graphql'] loads both src/ and dist/, so we must fix dist/ too.
echo "🔧 Syncing subgraph-core SDL files from src to dist..."
CORE_SRC="/app/apps/subgraph-core/src"
CORE_DIST="/app/apps/subgraph-core/dist"
for SDL in tenant/tenant.graphql user/user.graphql gamification/gamification.graphql \
           admin/admin.graphql admin/announcements.graphql admin/audit.graphql \
           admin/security.graphql; do
    src_file="$CORE_SRC/$SDL"
    dist_file="$CORE_DIST/$SDL"
    if [ -f "$src_file" ] && [ -f "$dist_file" ]; then
        cp "$src_file" "$dist_file"
        echo "  ✅ Synced: $SDL"
    fi
done
echo "✅ subgraph-core SDL sync complete"

# ─── Initialize MinIO bucket (idempotent) ────────────────────
# Pre-create bucket directory so MinIO recognizes it on startup.
echo "🪣 Pre-creating MinIO bucket directory 'edusphere'..."
mkdir -p /data/minio/edusphere
echo "✅ MinIO bucket directory created"

# Write the minio-init script to /tmp so supervisord can run it after MinIO starts.
cat > /tmp/minio-create-bucket.cjs << 'MINIO_INIT_SCRIPT'
'use strict';
const http = require('http');
const crypto = require('crypto');
const ENDPOINT = 'localhost';
const PORT = 9000;
const ACCESS_KEY = 'minioadmin';
const SECRET_KEY = 'minioadmin';
const BUCKET = 'edusphere';
const REGION = 'us-east-1';
function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}
function makeRequest(method, path, body, contentType) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = crypto.createHash('sha256').update(body || '').digest('hex');
    const ct = contentType || 'application/octet-stream';
    const canonicalHeaders = `content-type:${ct}\nhost:${ENDPOINT}:${PORT}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const signingKey = getSignatureKey(SECRET_KEY, dateStamp, REGION, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authHeader = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const bodyBuf = Buffer.from(body || '');
    const req = http.request({ hostname: ENDPOINT, port: PORT, path, method, headers: { Authorization: authHeader, 'Content-Type': ct, 'Content-Length': bodyBuf.length, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate } }, (res) => {
      let data = ''; res.on('data', (c) => (data += c)); res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyBuf.length > 0) req.write(bodyBuf);
    req.end();
  });
}
async function main() {
  console.log(`Checking MinIO bucket '${BUCKET}'...`);
  const head = await makeRequest('HEAD', `/${BUCKET}`, '', 'application/octet-stream');
  if (head.status === 200 || head.status === 403) {
    console.log(`Bucket '${BUCKET}' exists (HTTP ${head.status}).`);
  } else {
    const create = await makeRequest('PUT', `/${BUCKET}`, '', 'application/octet-stream');
    if (create.status === 200) { console.log(`Bucket '${BUCKET}' created.`); }
    else { console.error(`Failed to create bucket: HTTP ${create.status}\n${create.body}`); process.exit(1); }
  }
  console.log('MinIO init complete.');
}
main().catch((err) => { console.error('Error:', err); process.exit(1); });
MINIO_INIT_SCRIPT
echo "✅ MinIO init script written to /tmp/minio-create-bucket.cjs"

# ─── Hand off to supervisord ─────────────────────────────────
echo "🎯 Starting all services via Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/edusphere.conf
