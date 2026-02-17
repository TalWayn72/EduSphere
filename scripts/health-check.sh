#!/bin/bash

# EduSphere Health Check Script
# Verifies all infrastructure services are healthy

set -e

echo "🏥 EduSphere Health Check"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check function
check_service() {
  SERVICE=$1
  CHECK_CMD=$2

  echo -n "Checking $SERVICE... "

  if eval "$CHECK_CMD" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗${NC}"
    return 1
  fi
}

FAILED=0

# 1. PostgreSQL
if ! check_service "PostgreSQL" "docker exec edusphere-postgres pg_isready -U edusphere -d edusphere"; then
  FAILED=$((FAILED + 1))
fi

# 2. PostgreSQL Extensions
echo -n "Checking PostgreSQL extensions... "
EXTENSIONS=$(docker exec edusphere-postgres psql -U edusphere -d edusphere -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'age', 'vector')" 2>/dev/null || echo "0")
if [ "$EXTENSIONS" -eq "4" ]; then
  echo -e "${GREEN}✓${NC} (uuid-ossp, pgcrypto, age, vector)"
else
  echo -e "${RED}✗${NC} (expected 4, found $EXTENSIONS)"
  FAILED=$((FAILED + 1))
fi

# 3. Apache AGE Graph
echo -n "Checking Apache AGE graph... "
GRAPH_EXISTS=$(docker exec edusphere-postgres psql -U edusphere -d edusphere -t -c "SELECT COUNT(*) FROM ag_catalog.ag_graph WHERE name = 'edusphere_graph'" 2>/dev/null || echo "0")
if [ "$GRAPH_EXISTS" -eq "1" ]; then
  echo -e "${GREEN}✓${NC} (edusphere_graph)"
else
  echo -e "${RED}✗${NC} (graph not found)"
  FAILED=$((FAILED + 1))
fi

# 4. Redis
if ! check_service "Redis" "docker exec edusphere-redis redis-cli ping"; then
  FAILED=$((FAILED + 1))
fi

echo ""
echo "=========================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All services healthy!${NC}"
  exit 0
else
  echo -e "${RED}$FAILED service(s) failed health check${NC}"
  exit 1
fi
