#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# EduSphere Single Container Startup Script
# ═══════════════════════════════════════════════════════════════

set -e

echo "════════════════════════════════════════════════════════════"
echo "🚀 Starting EduSphere All-in-One Container"
echo "════════════════════════════════════════════════════════════"

# Create log directories
mkdir -p /var/log/postgresql
mkdir -p /var/log/redis
mkdir -p /var/log/nats
mkdir -p /var/log/minio
mkdir -p /var/log/keycloak
mkdir -p /var/log/ollama
mkdir -p /var/log/edusphere
mkdir -p /var/log/supervisor

# Set permissions
chown -R postgres:postgres /var/log/postgresql
chmod -R 755 /var/log

echo "📁 Log directories created"

# Wait for PostgreSQL to be ready (it starts via supervisor)
echo "⏳ Waiting for PostgreSQL to start..."
for i in {1..30}; do
    if pg_isready -U edusphere -d edusphere > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start"
        exit 1
    fi
    sleep 2
done

# Initialize Keycloak database if needed
echo "🔑 Checking Keycloak database..."
su - postgres -c "psql -lqt | cut -d \| -f 1 | grep -qw keycloak" || \
    su - postgres -c "createdb -O edusphere keycloak"
echo "✅ Keycloak database ready"

# Start all services via supervisor
echo "🎯 Starting all services via Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/edusphere.conf
