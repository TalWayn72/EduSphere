#!/bin/bash
# HiveMind Health Check — Development infrastructure only
# Usage: bash tools/scripts/hivemind-health.sh

echo "═══ HiveMind Health Check ═══"
echo ""

# ChromaDB
echo -n "ChromaDB (port 8100)... "
if curl -sf http://localhost:8100/api/v2/heartbeat > /dev/null 2>&1; then
  echo "OK"
else
  echo "NOT RUNNING (start with: docker-compose -f tools/docker-compose.hivemind.yml up -d)"
fi

# Coordination Bridge SQLite
BRIDGE_DB="${BRIDGE_DB_PATH:-C:/Users/P0039217/.claude/projects/EduSphere/.hivemind/coordination.db}"
echo -n "Coordination Bridge DB... "
if [ -f "$BRIDGE_DB" ]; then
  echo "OK ($BRIDGE_DB)"
else
  echo "NOT FOUND (will be created on first MCP tool call)"
fi

echo ""
echo "═══ Done ═══"
