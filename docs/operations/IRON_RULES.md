# Iron Rules — Security, Memory Safety & Autonomous Execution

> **Parent document:** [CLAUDE.md](../../CLAUDE.md)

## Security Invariants — ENFORCED (never violate)

These are non-negotiable. Any code violating these invariants must be rejected immediately.

| #         | Invariant                  | WRONG                                                     | RIGHT                                                                       |
| --------- | -------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| **SI-1**  | RLS session variable name  | `current_setting('app.current_user', TRUE)`               | `current_setting('app.current_user_id', TRUE)`                              |
| **SI-2**  | CORS origin in production  | `origin: '*'`                                             | `origin: process.env.CORS_ORIGIN?.split(',') ?? []`                         |
| **SI-3**  | PII fields in DB           | Store plaintext email/name/annotation text                | `encryptField(value, tenantKey)` before every write                         |
| **SI-4**  | Keycloak brute-force       | `"bruteForceProtected": false`                            | `"bruteForceProtected": true, "failureFactor": 5`                           |
| **SI-5**  | SSL verification in Docker | `curl --insecure` / `Acquire::https::Verify-Peer "false"` | `apt-get install -y ca-certificates && update-ca-certificates`              |
| **SI-6**  | Inter-service HTTP         | Plain `http://` subgraph URLs in production               | mTLS via Linkerd or `https://` with certs                                   |
| **SI-7**  | NATS without auth/TLS      | `connect({ servers: url })` bare                          | `connect({ servers, tls, authenticator })`                                  |
| **SI-8**  | DB direct access           | `new Pool()` / raw `pg` client                            | `getOrCreatePool()` from `@edusphere/db` only                               |
| **SI-9**  | Cross-tenant query         | Query without `withTenantContext()`                       | Always wrap: `withTenantContext(tenantId, userId, role, fn)`                |
| **SI-10** | LLM call without consent   | Forward user message to OpenAI/Anthropic directly         | Check `THIRD_PARTY_LLM` consent first — throw `CONSENT_REQUIRED` if missing |

**Enforcement:** Pre-commit hook and CI gate must run `pnpm test:rls` + `pnpm audit --audit-level=high`.
**Iron rule:** No commit may weaken any of SI-1 through SI-10. A failing invariant = a blocked PR.

---

## Security Pre-commit Gate (every code change)

| Check            | Rule                                                                          |
| ---------------- | ----------------------------------------------------------------------------- |
| XSS              | No unsanitized user input in GraphQL responses                                |
| SQL Injection    | All queries via Drizzle ORM (except Cypher via graph helpers)                 |
| NoSQL Injection  | All Cypher queries use parameterized prepared statements                      |
| RLS              | All tenant-scoped tables have `USING (tenant_id = current_setting(...))`      |
| JWT              | All mutations validate scopes (`@requiresScopes`) and roles (`@requiresRole`) |
| Input Validation | All mutations have Zod schemas                                                |
| Secrets          | No API keys, passwords, tokens in code (use env vars)                         |

## RLS Validation Checklist

- All 16 tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- All tenant-scoped tables have tenant isolation policy
- All queries use `withTenantContext()` wrapper
- Cross-tenant tests verify isolation (Tenant A cannot read Tenant B data)
- Personal annotations only visible to owner or instructors

## GraphQL Security

- All mutations use `@authenticated` directive
- Sensitive mutations use `@requiresScopes` (e.g., `course:write`, `agent:execute`)
- Admin-only mutations use `@requiresRole(roles: [SUPER_ADMIN, ORG_ADMIN])`
- Query depth limited to 10 (prevent DoS)
- Query complexity limited to 1000 (prevent expensive queries)
- Rate limiting at gateway level (per tenant, per IP)

**Iron rule:** No commit may weaken existing security (RLS, JWT validation, scopes, directives).

## Security Test Files

| Test File                                      | Coverage                           |
| ---------------------------------------------- | ---------------------------------- |
| `tests/security/rls-variables.spec.ts`         | SI-1: RLS session variable names   |
| `tests/security/cors-config.spec.ts`           | SI-2: CORS fail-closed             |
| `tests/security/pii-encryption.spec.ts`        | SI-3: AES-256-GCM encryption       |
| `tests/security/keycloak-config.spec.ts`       | G-12: Brute force protection       |
| `tests/security/dockerfile-security.spec.ts`   | G-05: SSL bypass patterns          |
| `tests/security/nats-security.spec.ts`         | SI-7: NATS TLS                     |
| `tests/security/audit-log.spec.ts`             | G-08: Audit trail                  |
| `tests/security/minio-config.spec.ts`          | G-17: MinIO encryption             |
| `tests/security/consent-management.spec.ts`    | G-04: Consent                      |
| `tests/security/data-retention.spec.ts`        | G-13: Retention TTLs               |
| `tests/security/gdpr-erasure.spec.ts`          | G-03+G-11: Erasure+Portability     |
| `tests/security/api-security.spec.ts`          | G-09+G-10: Rate limit + complexity |
| `tests/security/graphql-authorization.spec.ts` | G-15: @requiresScopes              |
| `tests/security/ai-compliance.spec.ts`         | SI-10: LLM consent                 |
| `tests/security/eu-ai-act.spec.ts`             | EU AI Act: transparency            |

---

## Memory Safety (Mandatory)

**Iron rule:** No commit may introduce a memory leak. Every resource opened must have a corresponding close/cleanup path.

### Backend Rules

| Rule                                                                                                                       | Pattern                      |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Every `@Injectable()` service with `createDatabaseConnection()` MUST implement `OnModuleDestroy` calling `closeAllPools()` | `implements OnModuleDestroy` |
| Every `@Injectable()` service with `new NatsKVClient()` MUST call `this.kv.close()` in `OnModuleDestroy`                   | Lifecycle hook               |
| Every `setInterval`/`setTimeout` in a NestJS service MUST store the handle and clear it in `OnModuleDestroy`               | Handle in class field        |
| All async `for await` subscription loops MUST be stoppable via the subscription's `unsubscribe()`                          | Subscription tracking array  |
| Fire-and-forget async MUST use `Promise.race(task, timeoutPromise)` with DB failure update on timeout                      | 5-min default timeout        |
| Unbounded `Map`/`Array` MUST have max-size eviction (insertion-order LRU for Map, `slice(-N)` for arrays)                  | Size guard                   |
| Database pools MUST use `getOrCreatePool()` from `@edusphere/db` — never `new Pool()` directly                             | Import `getOrCreatePool`     |

### Frontend Rules

| Rule                                                                                                | Pattern                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Every `setInterval` in component/hook MUST have `clearInterval` in `useEffect` cleanup return       | `const ref = useRef(); useEffect(() => () => clearInterval(ref.current), [])`                                              |
| Every `setTimeout` inside a component MUST be stored in `useRef` and cleared in `useEffect` cleanup | Same pattern                                                                                                               |
| NEVER `return () => cleanup()` inside `useCallback` — the return value is **discarded** by React    | Use `useEffect` for cleanup instead                                                                                        |
| GraphQL subscriptions (`useSubscription`) MUST use `pause: true` flag tied to component mount state | `const [paused, setPaused] = useState(false); useEffect(() => () => setPaused(true), [])`                                  |
| `useQuery` in React Router sibling routes sharing a query MUST use mounted guard                    | `const [mounted, setMounted] = useState(false); useEffect(() => { setMounted(true); }, []); useQuery({ pause: !mounted })` |
| Module-level WebSocket clients MUST be disposed on `window.beforeunload`                            | `window.addEventListener('beforeunload', () => client.dispose())`                                                          |

### Infrastructure Rules

| Rule                                                                                                    | Pattern                    |
| ------------------------------------------------------------------------------------------------------- | -------------------------- |
| ALL Docker services MUST have `mem_limit` AND `mem_reservation` in docker-compose files                 | Validated in CI            |
| All Node.js services MUST set `NODE_OPTIONS=--max-old-space-size` <= 75% of container `mem_limit`       | Environment block          |
| ALL NATS JetStream streams MUST declare `max_age` AND `max_bytes` at creation                           | Use stream factory helper  |
| LangGraph checkpointers MUST be wrapped in NestJS `@Injectable()` with `OnModuleInit`/`OnModuleDestroy` | `LangGraphService` pattern |

### Memory Testing Rules (required for every new service/hook)

| Change Type                                 | Required Test                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| New NestJS service with DB/NATS connections | `*.memory.spec.ts` verifying `onModuleDestroy` calls cleanup                   |
| New React hook with timers or subscriptions | `*.memory.test.ts` verifying `unmount` triggers `clearTimeout`/`clearInterval` |
| New unbounded Map or growing array          | Test verifying eviction fires at configured max size                           |
| New async subscription loop                 | Test verifying loop exits cleanly on `unsubscribe()`                           |
| New `setInterval` anywhere                  | Test verifying `clearInterval` called on service destroy or component unmount  |

### OOM Response Protocol

| Event                            | Action                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Container OOM-killed             | Check `docker stats`, identify service, increase `mem_limit` OR fix the leak        |
| Node.js heap OOM                 | Run with `--expose-gc` + `--heap-prof`, analyze `.heapprofile` in Chrome DevTools   |
| NATS memory pressure             | Check stream sizes: `nats stream ls` + `nats stream info <name>`, enforce retention |
| PostgreSQL connection exhaustion | Check `pg_stat_activity`, verify `closeAllPools()` is called on service destroy     |
| First OOM in CI                  | Reduce parallel agents by 20% (see Parallel Execution section)                      |
