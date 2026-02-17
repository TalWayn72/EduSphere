#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# EduSphere Infrastructure Health Check
# Validates all services are running and healthy
# ═══════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for failures
FAILURES=0

echo "═══════════════════════════════════════════════════════════════"
echo "🏥 EduSphere Infrastructure Health Check"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Function to check service health
check_service() {
    local service_name=$1
    local check_command=$2
    local description=$3

    echo -n "Checking ${service_name}... "

    if eval "${check_command}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${description}${NC}"
    else
        echo -e "${RED}✗ ${description} - FAILED${NC}"
        ((FAILURES++))
    fi
}

# PostgreSQL
check_service "PostgreSQL" \
    "docker exec edusphere-postgres pg_isready -U edusphere -d edusphere" \
    "PostgreSQL 16 accepting connections"

check_service "Apache AGE" \
    "docker exec edusphere-postgres psql -U edusphere -d edusphere -tAc \"SELECT extname FROM pg_extension WHERE extname='age'\" | grep -q age" \
    "Apache AGE extension loaded"

check_service "pgvector" \
    "docker exec edusphere-postgres psql -U edusphere -d edusphere -tAc \"SELECT extname FROM pg_extension WHERE extname='vector'\" | grep -q vector" \
    "pgvector extension loaded"

check_service "AGE Graph" \
    "docker exec edusphere-postgres psql -U edusphere -d edusphere -tAc \"SELECT * FROM ag_catalog.ag_graph WHERE name='edusphere_graph'\" | grep -q edusphere_graph" \
    "Apache AGE graph 'edusphere_graph' exists"

# Keycloak
check_service "Keycloak" \
    "curl -sf http://localhost:8080/health/ready" \
    "Keycloak OIDC server ready"

check_service "Keycloak Realm" \
    "curl -sf http://localhost:8080/realms/edusphere" \
    "Keycloak 'edusphere' realm configured"

# NATS JetStream
check_service "NATS" \
    "curl -sf http://localhost:8222/healthz" \
    "NATS JetStream server healthy"

# MinIO
check_service "MinIO" \
    "curl -sf http://localhost:9000/minio/health/live" \
    "MinIO object storage ready"

# Redis
check_service "Redis" \
    "docker exec edusphere-redis redis-cli -a edusphere_redis_password ping | grep -q PONG" \
    "Redis cache responding"

# Jaeger
check_service "Jaeger" \
    "curl -sf http://localhost:16686" \
    "Jaeger tracing UI accessible"

# Ollama
check_service "Ollama" \
    "curl -sf http://localhost:11434/api/tags" \
    "Ollama LLM server responding"

echo ""
echo "═══════════════════════════════════════════════════════════════"

# Summary
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All services are healthy!${NC}"
    echo ""
    echo "🌐 Service URLs:"
    echo "   PostgreSQL:      localhost:5432"
    echo "   Keycloak Admin:  http://localhost:8080 (admin/admin)"
    echo "   NATS Monitor:    http://localhost:8222"
    echo "   MinIO Console:   http://localhost:9001 (minioadmin/minioadmin)"
    echo "   Redis:           localhost:6379"
    echo "   Jaeger UI:       http://localhost:16686"
    echo "   Ollama API:      http://localhost:11434"
    echo ""
    echo "✅ Ready to start Phase 0.3: First Subgraph"
    exit 0
else
    echo -e "${RED}❌ ${FAILURES} service(s) failed health check${NC}"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Run: docker-compose up -d"
    echo "   2. Check logs: docker-compose logs -f [service]"
    echo "   3. Restart failed services: docker-compose restart [service]"
    exit 1
fi
