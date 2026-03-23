---
name: Service Restoration Iron Rule
description: ALWAYS restore all Docker/infrastructure services after ANY operation that disrupts them - user must NEVER see ERR_CONNECTION_REFUSED
type: feedback
---

After ANY operation that touches services, containers, or infrastructure (code changes, docker rebuilds, config edits, service restarts), ALL services MUST be verified and restored before ending that operation.

**Why:** The user repeatedly encounters ERR_CONNECTION_REFUSED on {AUTH_SERVICE}/{FRONTEND_SERVICE}/{GATEWAY_SERVICE} because agents leave services down after modifications. This makes manual testing impossible and violates the development workflow contract.

**How to apply:**
1. After EVERY disruptive operation: run `docker ps` + `{HEALTH_CHECK_COMMAND}`
2. If ANY service is down: `{CONTAINER_ORCHESTRATION} up -d` → wait → verify ALL endpoints
3. Required endpoints: {AUTH_SERVICE}({AUTH_PORT}), {GATEWAY_SERVICE}({GATEWAY_PORT}), {FRONTEND_SERVICE}({FRONTEND_PORT}), Database({DB_PORT}), Message Queue({MQ_PORT})
4. This check runs after EVERY code change and EVERY fix round — not just at session end
5. Added as Iron Rule in BUG_FIX_PROTOCOL.md and [PROJECT_INSTRUCTIONS]
6. The user must NEVER open their browser and see ERR_CONNECTION_REFUSED
