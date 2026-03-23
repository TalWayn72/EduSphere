---
name: Container verification before bug-fix completion
description: MUST verify fix works inside running container (service status, live API query) before declaring any bug fixed
type: feedback
---

**Before declaring ANY bug fixed, verify it works in the running container — not just in tests.**

**Why:** A bug was "fixed" with schema changes and unit tests, but one service was FATAL inside the container due to missing dependencies and an invalid directive. The fix was declared complete without checking service status — meaning the user saw the exact same bug when they tested.

**How to apply — mandatory checklist for every bug fix:**

1. Check service supervisor status — ALL services must be RUNNING (not FATAL/BACKOFF)
2. If any service is FATAL → read crash log from the service supervisor stderr
3. Fix the container issue (missing deps, bad schema, etc.) before continuing
4. Make a REAL API query through the gateway: `curl -s -X POST http://localhost:{GATEWAY_PORT}/graphql -H "Content-Type: application/json" -d '{"query":"..."}'` — verify it reaches the service (not ECONNREFUSED)
5. Only THEN declare the bug fixed

**Container-specific traps to watch for:**
- Bind mounts may be read-only — changes to source files may not auto-reflect in container dist
- ESM-only packages may fail with `Cannot find module` under CJS require
- Package manager hoisting: package in manifest but symlink missing → reinstall inside container
- Custom schema directives must be properly declared or the service crashes at startup
