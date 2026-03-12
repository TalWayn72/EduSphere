# Plan: Fix Recurring GraphQL Network Error Banner — Permanent Fix

---

## Context

**Problem:** The `/courses` page repeatedly shows:
> `⚠ Failed to fetch — [GraphQL] Unexpected error [Network] — מציג נתונים מהמטמון.`

This message is **doubly confusing** because:
- `CourseList.tsx:314` manually prepends `[Network] Failed to fetch — ` to `error.message`
- `error.message` from urql for a network error is itself `[GraphQL] Unexpected error [Network]`
- Result: repeated/redundant technical jargon shown to users

**Why it recurs:** No visual/E2E test verifies this banner's content. Every time the gateway is unavailable (dev startup order, container restart, CI), this banner fires with the raw urql error string.

**Requested additions:**
1. Systematic similar-issue search across ALL pages after identifying a bug
2. Full round of fixes ending in complete tests (unit + visual)
3. Logging on failure
4. Update CLAUDE.md bug fix protocol to require similar-issue search

---

## Root Cause Analysis

### Primary Bug Location
**File:** `apps/web/src/pages/CourseList.tsx:312-316`
```tsx
{error && (
  <OfflineBanner
    message={`[Network] Failed to fetch — ${error.message}`}  // ← BROKEN
    cachedLabel={t('showingCachedData')}
  />
)}
```

When urql's network fetch fails → `error.message = "[GraphQL] Unexpected error [Network]"`:
- Displayed: `[Network] Failed to fetch — [GraphQL] Unexpected error [Network] — מציג נתונים מהמטמון`
- OfflineBanner shows even when MOCK_COURSES_FALLBACK is already displayed (page still works!)
- No retry button
- `useQuery` lacks a `reexecute` binding (second destructure element unused)

### urql-client.ts Issues
**File:** `apps/web/src/lib/urql-client.ts`
- `authErrorExchange` only logs auth errors — network errors are silently swallowed
- No network error structured log (violates "no logs = part of the bug" iron rule)

### Similar Pattern Found Across Pages (from multi-agent scan)
| Page | File | Error Handling | Missing |
|------|------|----------------|---------|
| CollaborationPage | `pages/CollaborationPage.tsx:74-88` | Error destructured, `isSchemaValidationError` checked, **no UI shown** | Error banner UI |
| AgentsPage | `pages/AgentsPage.tsx:384-402` | `hasTemplatesError` shown as tiny text | No retry |
| CourseAnalyticsPage | `pages/CourseAnalyticsPage.tsx:148-150` | Shows generic error state | No retry |
| CourseList | `pages/CourseList.tsx:312-316` | **Primary bug**: raw urql string | Fix message + retry |

---

## Fix Waves

### Wave 1 — Fix CourseList.tsx (Primary)

**File:** `apps/web/src/pages/CourseList.tsx`

Changes:
1. Destructure `reexecute` from `useQuery` (currently unused second element)
2. Rewrite `OfflineBanner` component:
   - Accept `onRetry: () => void` instead of raw `message: string`
   - Show clean human-readable message using i18n key `networkUnavailable`
   - Add "נסה שוב" retry button that calls `reexecute({ requestPolicy: 'network-only' })`
   - Add `role="alert"` + `aria-live="polite"` for accessibility
   - Add `data-testid="offline-banner"` for Playwright targeting
3. Fix line 312 condition: `{error && <OfflineBanner onRetry={() => reexecute({ requestPolicy: 'network-only' })} />}`
4. Add `console.error('[CourseList] GraphQL network error:', error.message)` for devtools logging

**i18n key to add** in `apps/web/public/locales/he/courses.json` and `en/courses.json`:
- `"networkUnavailable": "שרת לא נגיש — מציג נתוני גיבוי"` (he)
- `"networkUnavailable": "Server unavailable — showing backup data"` (en)
- `"retry": "נסה שוב"` (he) / `"retry": "Retry"` (en)

### Wave 2 — urql-client.ts: Add Network Error Logging

**File:** `apps/web/src/lib/urql-client.ts`

Change `authErrorExchange`'s `onError` handler to also log network errors:
```typescript
// NEW: log network errors (always, not just auth errors)
if (error.networkError) {
  console.warn(
    `[GraphQL][Network] ${operation.kind} "${operation.query.definitions[0]?.name?.value ?? '?'}": ${error.networkError.message}`
  );
}
```

This gives devtools-visible trace without exposing details to UI.

### Wave 3 — Fix Similar Pages

#### CollaborationPage (`apps/web/src/pages/CollaborationPage.tsx`)
- Add an inline banner when `error && !DEV_MODE && !isSchemaValidationError`
- Use same i18n key pattern (`networkUnavailable`)
- Add `data-testid="collab-network-error"` for testability

#### AgentsPage (`apps/web/src/pages/AgentsPage.tsx`)
- Upgrade existing `<p className="text-xs text-destructive">` to use the shared inline error style
- Add retry trigger for `templatesResult`

### Wave 4 — Unit Tests

#### `apps/web/src/pages/CourseList.test.tsx` — Add tests:
1. `'shows clean offline banner when GraphQL network error occurs'`
   - Mock `useQuery` to return `error: { message: '[GraphQL] Unexpected error [Network]', ... }`
   - Assert: `screen.getByTestId('offline-banner')` is visible
   - Assert: Banner does NOT contain `[GraphQL]` or `[Network]` text (raw urql strings)
   - Assert: Banner contains i18n `networkUnavailable` string
   - Assert: Mock fallback courses are visible (4 cards with `h3`)
2. `'shows retry button in offline banner'`
   - Assert `getByRole('button', { name: /retry|נסה שוב/ })` is visible
3. `'does not show offline banner when query succeeds'`
   - Mock `useQuery` to return real courses, no error
   - Assert: `queryByTestId('offline-banner')` is `null`

#### `apps/web/src/lib/urql-client.test.ts` — Add tests:
1. `'logs network errors to console.warn'`
   - Spy on `console.warn`
   - Simulate operation with `networkError`
   - Assert `console.warn` called with `[GraphQL][Network]` prefix

### Wave 5 — Playwright E2E Visual Test

**File:** `apps/web/e2e/courses.spec.ts` — Add test group:
```
test.describe('Course List — offline/network error state', () => {
  test('shows clean offline banner when GraphQL fails', async ({ page }) => {
    // 1. Login in DEV_MODE
    await login(page);
    // 2. Intercept GraphQL requests and simulate failure
    await page.route('**/graphql', route => route.abort('failed'));
    // 3. Navigate to courses
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    // 4. Assert offline banner visible
    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 8_000 });
    // 5. Assert banner does NOT contain raw urql error strings
    await expect(banner).not.toContainText('[GraphQL]');
    await expect(banner).not.toContainText('[Network]');
    // 6. Assert mock courses still shown (page is functional)
    const cards = page.locator('h3');
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
    // 7. Assert retry button is visible
    const retryBtn = banner.getByRole('button');
    await expect(retryBtn).toBeVisible();
    // 8. Snapshot: visual regression
    await expect(page).toHaveScreenshot('courses-offline-banner.png');
  });
});
```

### Wave 6 — Update CLAUDE.md Bug Fix Protocol

In `CLAUDE.md`, update the **Bug Fix Protocol** section to add Step 4 (similar issue search) and Step 5 (visual verification):

```markdown
## Bug Fix Protocol

1. **Read logs first** — Subgraph logs, Gateway logs, PostgreSQL logs, NATS logs, Frontend console
2. **If no logs exist** — Add logging as part of the fix (Pino logger on backend; console.error in urql-client.ts on frontend)
3. **Reproduce** — Write a failing test that reproduces the bug
4. **Search for ALL similar issues** — After identifying the root cause, execute ALL of these searches across the FULL codebase:
   - Same code pattern (exact grep)
   - Variants (similar logic with slightly different naming/structure)
   - Same component/hook type in ALL pages (not just the reported page)
   - Any page that uses the same API/hook/component
   Fix ALL instances found before declaring the bug fixed. Track each in OPEN_ISSUES.md.
5. **Fix in rounds** — Fix root cause + all similar issues. Each round ends with:
   - Full test suite pass (`pnpm --filter @edusphere/web test --run`)
   - TypeScript check pass (`pnpm --filter @edusphere/web exec tsc --noEmit`)
   - **Visual browser verification** (Playwright screenshot or manual) for any UI change
6. **Write new tests** — For EVERY fix:
   - Unit test verifying correct behavior
   - Unit test verifying the bad behavior is GONE (regression guard)
   - Playwright E2E test for UI changes (including visual screenshot)
7. **Verify** — Run tests + health check + E2E smoke test
8. **Document** in `OPEN_ISSUES.md`:
   - Status: 🔴 Open → 🟡 In Progress → ✅ Fixed
   - Severity: 🔴 Critical / 🟡 Medium / 🟢 Low
   - Files, problem, root cause, solution, tests

**Iron rules:**
- Never fix a bug without reading the logs first. No logs = part of the bug.
- After finding a bug, ALWAYS search for the same pattern across ALL pages before declaring it fixed.
- No fix is complete without a regression test that would catch the bug if it reappears.
- Visual UI bugs MUST have a Playwright screenshot test.
```

### Wave 7 — Deployment Verification

After all fixes and tests pass:
1. `docker-compose up -d` — bring up all infra
2. `pnpm --filter @edusphere/web dev` — start frontend
3. `pnpm --filter @edusphere/gateway dev` — start gateway
4. Verify all 5 test users are accessible (via Playwright or browser manual check)
5. Navigate to `/courses` — verify NO error banner appears when gateway is running
6. Stop gateway → navigate to `/courses` — verify clean error banner appears (not raw urql string)
7. Click retry → gateway returns → banner disappears and real data loads

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/pages/CourseList.tsx` | Fix OfflineBanner: clean message, retry button, data-testid |
| `apps/web/src/lib/urql-client.ts` | Add network error logging in errorExchange |
| `apps/web/src/pages/CollaborationPage.tsx` | Add missing error UI |
| `apps/web/src/pages/AgentsPage.tsx` | Upgrade error display, add retry |
| `apps/web/src/pages/CourseList.test.tsx` | 3 new tests for error/offline state |
| `apps/web/src/lib/urql-client.test.ts` | 1 new test for network error logging |
| `apps/web/e2e/courses.spec.ts` | New E2E group: offline banner visual test |
| `apps/web/public/locales/he/courses.json` | Add `networkUnavailable`, `retry` keys |
| `apps/web/public/locales/en/courses.json` | Add `networkUnavailable`, `retry` keys |
| `CLAUDE.md` | Update Bug Fix Protocol (Steps 4-6) |
| `OPEN_ISSUES.md` | Document as BUG-039 |
| `docs/plans/` | Move this plan file here |

## Reusable Patterns to Reference

- `parseSourceError()` in `apps/web/src/components/SourceManager.tsx:170-184` — pattern for clean error message extraction
- `loginInDevMode()` in `apps/web/e2e/auth.helpers.ts` — Playwright auth helper
- `attachNetworkMonitor()` in `apps/web/e2e/auth.helpers.ts` — Playwright network error collector
- `data-testid="dev-login-btn"` pattern — testid-based Playwright targeting

## Verification Steps (End-to-End)

```bash
# 1. Unit tests (all must pass)
pnpm --filter @edusphere/web test --run

# 2. TypeScript (zero errors)
pnpm --filter @edusphere/web exec tsc --noEmit

# 3. ESLint (zero warnings)
mcp__eslint__lint-files on each modified file

# 4. E2E visual test (run the new offline banner test)
pnpm --filter @edusphere/web test:e2e -- courses

# 5. Manual visual check:
#    - Gateway running: /courses shows courses with NO error banner
#    - Gateway stopped: /courses shows clean Hebrew "שרת לא נגיש" banner + mock courses
#    - Click Retry with gateway running: banner disappears, real courses load

# 6. Deployment verification
docker-compose up -d && pnpm --filter @edusphere/gateway dev &
# Verify all 5 Keycloak users work (superAdmin, instructor, student, orgAdmin, researcher)
```

---

## Ordering Constraint

All waves must complete fully before Wave 7. Waves 1-3 can parallelize (independent files). Waves 4-5 depend on Wave 1-3 completing (tests must reflect the new code). Wave 6 is independent (docs only). Wave 7 is last.
