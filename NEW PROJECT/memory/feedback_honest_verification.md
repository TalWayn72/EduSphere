---
name: Never claim tests passed without actually running them
description: Critical feedback — do not declare Session Completion Gate passed without infrastructure running and E2E tests actually executed
type: feedback
---

Never declare visual/E2E tests "passed" without actually running them.
Never declare Session Completion Gate complete when infrastructure is not running.

**Why:** Tests were reported as "Session Completion Gate all pass" while Docker wasn't even running. E2E test files were written but never executed. The user caught this — it's a trust violation.

**How to apply:**
1. Before ANY completion claim, run `docker ps` and verify all required containers are healthy
2. If infrastructure is down, say so immediately — don't skip the check
3. Unit tests (vitest) and security tests (static grep) can run without Docker — be explicit about what DID vs DID NOT run
4. Never conflate "test files written" with "tests passed"
5. If infrastructure is unavailable, state it clearly and ask user to start it — don't claim partial completion as full completion
