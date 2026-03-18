#!/bin/bash

# EduSphere Docker Daemon Ensurer
# Checks if Docker daemon is reachable. If not, attempts to start Docker Desktop
# and waits up to 90 seconds for the daemon to become available.
# Exit codes: 0 = Docker ready, 1 = Docker unreachable after all retries

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MAX_WAIT=90  # seconds

echo -n "Checking Docker daemon... "

# Fast path: Docker is already running
if docker ps > /dev/null 2>&1; then
  echo -e "${GREEN}OK${NC}"
  exit 0
fi

echo -e "${YELLOW}not responding${NC}"

# Attempt to start Docker Desktop (Windows)
if [ -f "/c/Program Files/Docker/Docker/Docker Desktop.exe" ] || \
   [ -f "C:/Program Files/Docker/Docker/Docker Desktop.exe" ]; then
  echo "Starting Docker Desktop..."
  "C:/Program Files/Docker/Docker/Docker Desktop.exe" 2>/dev/null &
fi

# Wait for Docker daemon to become available
echo -n "Waiting for Docker daemon (max ${MAX_WAIT}s)... "
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if docker ps > /dev/null 2>&1; then
    echo -e "${GREEN}ready after ${ELAPSED}s${NC}"
    exit 0
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo -n "."
done

echo ""
echo -e "${RED}Docker daemon still not available after ${MAX_WAIT}s.${NC}"
echo "Please start Docker Desktop manually and retry."
exit 1
