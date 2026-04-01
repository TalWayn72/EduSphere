# Session Completion Gate

> **Parent document:** [CLAUDE.md](../../CLAUDE.md)
> **IRON RULE — NEVER VIOLATE**

**MANDATORY:** Claude may NEVER declare a session, feature, or task "complete" without producing and verifying the following table in full. Every row must show a pass before completion is announced.

> **Trigger phrase:** When the user asks "Show Session Completion Report" — produce this table immediately with real results.

## Completion Check Table

| #   | Check                   | Command                                                             | Required Result                         |
| --- | ----------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| -1  | Orchestrator Compliance | Self-audit: Did Orchestrator use Edit/Write/mutating Bash directly? | 0 violations — all work done via agents |
| 0   | Docker Up               | `docker ps \| grep -c healthy`                                      | >=5 containers healthy                  |
| 1   | Unit Tests              | `pnpm turbo test`                                                   | 100% pass, 0 failures                   |
| 2   | TypeScript              | `pnpm turbo typecheck`                                              | 0 errors                                |
| 3   | Lint                    | `pnpm turbo lint`                                                   | 0 warnings/errors                       |
| 4   | Security Tests          | `pnpm test:security`                                                | 0 failures                              |
| 5   | E2E Playwright          | `pnpm --filter @edusphere/web test:e2e`                             | all pass                                |
| 6   | Health Check            | `./scripts/health-check.sh`                                         | all services UP                         |
| 7   | 5-User Auth             | Keycloak login x 5 roles                                            | all login OK                            |
| 8   | GitHub CI               | `gh run list --limit 3`                                             | all green                               |
| 9   | Git Push                | `git log --oneline -1`                                              | commit pushed                           |
| 10  | OPEN_ISSUES.md          | updated with E2E files listed                                       | status passed                           |
| 11  | Memory Audit            | `vm_get_recent({ n: 10 })`                                          | >=1 decision stored this session        |

## 5 Test Users (for Check #7)

| User                      | Role        | Password       |
| ------------------------- | ----------- | -------------- |
| super.admin@edusphere.dev | SUPER_ADMIN | SuperAdmin123! |
| instructor@example.com    | INSTRUCTOR  | Instructor123! |
| org.admin@example.com     | ORG_ADMIN   | OrgAdmin123!   |
| researcher@example.com    | RESEARCHER  | Researcher123! |
| student@example.com       | STUDENT     | Student123!    |

## Iron Rules for Completion

- **NEVER** say "complete" or "done" without running every check above
- **NEVER** mark OPEN_ISSUES.md as done without listing the actual E2E spec files written
- **EVERY** new feature/fix requires a Playwright E2E spec — unit tests alone are NOT sufficient
- **EVERY** visual UI change requires `toHaveScreenshot()` visual regression test
- **Agent work is not done** until the Orchestrator has reviewed all agent outputs and confirmed the table above
- If any row fails: fix then re-run ALL downstream checks — never partial sign-off
- **ALWAYS restore services after ANY disruption** — If Docker/services went down during the session, bring them ALL back before running the gate. The user must NEVER open their browser and see ERR_CONNECTION_REFUSED.

## Parallel Agents — Completion Protocol

When running parallel agents:

1. Wait for ALL agents to complete before declaring session done
2. Review each agent's output for errors, gaps, or missed tests
3. Spawn fix agents for any gaps found
4. Only after all agents report clean — run the Completion Gate table
