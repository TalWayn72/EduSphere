# Fix: Hebrew Language Selection Reverts to English

## Context

When a user changes the language to Hebrew (עברית) in the Settings page, the UI briefly shows the success toast "העדפת שפה נשמרה" but immediately reverts to English. The bug was introduced when Hebrew was added to the i18n package (`packages/i18n/src/index.ts`) but the backend Zod validation schema was NOT updated to include `'he'`.

## Root Cause

**File:** `apps/subgraph-core/src/user/user.schemas.ts` — line 6

```ts
const SUPPORTED_LOCALES = [
  'en',
  'zh-CN',
  'hi',
  'es',
  'fr',
  'bn',
  'pt',
  'ru',
  'id',
  //                                                          ↑ 'he' missing
] as const;
```

**Failure chain:**

1. User selects Hebrew → `setLocale('he')` runs optimistic update (i18n + localStorage) ✅
2. `updatePreferences({ input: { locale: 'he' } })` mutation fires
3. Resolver calls `UpdateUserPreferencesSchema.parse(input)` → **Zod throws** `ZodError` — `'he'` not in enum
4. GraphQL returns error → DB is never updated (still `locale: 'en'`)
5. urql refetches `ME_QUERY` → returns `locale: 'en'` from DB
6. `useEffect` in `useUserPreferences.ts` detects `dbLocale='en'` ≠ `i18n.language='he'` → calls `i18n.changeLanguage('en')` → UI reverts

The `useUserPreferences` hook logic is **correct** — it only overwrites because the mutation failed silently.

## Fix

### 1. `apps/subgraph-core/src/user/user.schemas.ts`

Add `'he'` to the `SUPPORTED_LOCALES` array (sync with `packages/i18n/src/index.ts`):

```ts
const SUPPORTED_LOCALES = [
  'en',
  'zh-CN',
  'hi',
  'es',
  'fr',
  'bn',
  'pt',
  'ru',
  'id',
  'he',
] as const;
```

### 2. `apps/subgraph-core/src/user/user-preferences.service.spec.ts`

Add regression test at the end of the `updatePreferences()` describe block:

```ts
it('accepts Hebrew locale (he) without throwing', async () => {
  await expect(
    service.updatePreferences('user-1', { locale: 'he' }, MOCK_AUTH)
  ).resolves.toBeDefined();
});
```

### 3. `OPEN_ISSUES.md`

Document the bug fix with status ✅ Fixed.

## Files to Modify

| File                                                           | Change                                     |
| -------------------------------------------------------------- | ------------------------------------------ |
| `apps/subgraph-core/src/user/user.schemas.ts`                  | Add `'he'` to `SUPPORTED_LOCALES` (line 6) |
| `apps/subgraph-core/src/user/user-preferences.service.spec.ts` | Add Hebrew locale regression test          |
| `OPEN_ISSUES.md`                                               | Document the fix                           |

## No Changes Needed In

- `useUserPreferences.ts` — hook logic is correct
- `LanguageSelector.tsx` — already renders Hebrew correctly
- `packages/i18n/src/index.ts` — already includes `'he'`
- DB schema — JSONB column is locale-agnostic

## Verification

1. Run unit tests: `pnpm --filter @edusphere/subgraph-core test`
   - All existing tests pass
   - New Hebrew regression test passes

2. TypeScript: `pnpm turbo typecheck` — zero errors

3. Manual: Open Settings → change language to Hebrew → confirm selector stays on Hebrew after save, UI switches to RTL, "העדפת שפה נשמרה" toast appears and selection persists on page refresh

## Note on Plan File Location

Per CLAUDE.md: after plan approval, move this file to `docs/plans/` inside the project before starting implementation.
