#!/usr/bin/env bash
# EduSphere Automated Health Monitor
# Runs every 15 minutes via Claude Code CronCreate.
# Checks all local stack services and auto-restarts any that are down.
# Maintenance mode: touch .maintenance-mode in project root to pause for 30 min.

set -uo pipefail

PROJECT_DIR="c:/Users/P0039217/.claude/projects/EduSphere"
LOG_FILE="$PROJECT_DIR/docs/logs/health-monitor.log"
MAINTENANCE_FLAG="$PROJECT_DIR/.maintenance-mode"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
RESTART_HAPPENED=0

log() { echo "[$TIMESTAMP] $*" >> "$LOG_FILE"; }

# ── 1. Maintenance mode check ─────────────────────────────────────────────────
if [ -f "$MAINTENANCE_FLAG" ]; then
  # stat -c %Y gives mtime on Linux/Git-bash; fallback to 0 if unavailable
  FLAG_MTIME=$(stat -c %Y "$MAINTENANCE_FLAG" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  FLAG_AGE=$(( NOW - FLAG_MTIME ))
  if [ "$FLAG_AGE" -lt 1800 ]; then
    log "MAINTENANCE MODE — skipping (${FLAG_AGE}s old, < 30 min)"
    exit 0
  fi
  rm -f "$MAINTENANCE_FLAG"
  log "MAINTENANCE FLAG expired (${FLAG_AGE}s >= 30 min) — auto-clearing, proceeding with checks"
fi

# ── 2. Docker daemon check ───────────────────────────────────────────────────
if ! docker ps > /dev/null 2>&1; then
  log "CRITICAL: Docker daemon not responding — cannot auto-recover (start Docker Desktop manually)"
  exit 1
fi

# ── 3. Container check ───────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "edusphere-all-in-one"; then
  log "WARN: edusphere-all-in-one container is down — running docker-compose up -d"
  cd "$PROJECT_DIR" && docker-compose up -d >> "$LOG_FILE" 2>&1
  RESTART_HAPPENED=1
  sleep 30  # wait for supervisord to start all services
fi

# ── 4. Supervisor services ───────────────────────────────────────────────────
for svc in subgraph-core subgraph-content subgraph-annotation subgraph-collaboration subgraph-agent subgraph-knowledge gateway; do
  SVC_STATUS=$(docker exec edusphere-all-in-one supervisorctl status "$svc" 2>/dev/null | awk '{print $2}' || echo "UNKNOWN")
  if [ "$SVC_STATUS" != "RUNNING" ]; then
    # Capture last known reason from container logs
    CRASH_REASON=$(docker logs --tail 10 edusphere-all-in-one 2>/dev/null \
      | grep -E "exited|FATAL|Error|error" \
      | grep "$svc" \
      | tail -2 \
      | tr '\n' ' ')
    log "RESTART: $svc was $SVC_STATUS | Reason: ${CRASH_REASON:-unknown}"
    docker exec edusphere-all-in-one supervisorctl restart "$svc" 2>/dev/null || true
    RESTART_HAPPENED=1
    sleep 8  # brief pause between restarts
  fi
done

# ── 5. Gateway HTTP check ────────────────────────────────────────────────────
GW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}' 2>/dev/null || echo "000")
if [ "$GW_STATUS" != "200" ]; then
  log "WARN: Gateway HTTP $GW_STATUS — restarting via supervisorctl"
  docker exec edusphere-all-in-one supervisorctl restart gateway 2>/dev/null || true
  RESTART_HAPPENED=1
fi

# ── 6. Frontend (Vite dev server) check ─────────────────────────────────────
FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  http://localhost:5173 2>/dev/null || echo "000")
if [ "$FE_STATUS" != "200" ]; then
  log "WARN: Frontend 5173 returned HTTP $FE_STATUS — restarting pnpm dev"
  cd "$PROJECT_DIR" && pnpm --filter @edusphere/web dev >> "$LOG_FILE" 2>&1 &
  RESTART_HAPPENED=1
fi

# ── 7. Summary ───────────────────────────────────────────────────────────────
if [ "$RESTART_HAPPENED" -eq 1 ]; then
  log "RECOVERY COMPLETE — one or more services were restarted (see above)"
else
  log "OK — all services healthy (docker ✓, 7 supervisor services ✓, gateway ✓, frontend ✓)"
fi
