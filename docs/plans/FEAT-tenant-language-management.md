# Feature: Per-Tenant Language Management

## Context

Currently all 10 languages are hardcoded and always available to all users on all tenants.
The admin (Org Admin) has no control over which languages appear in the language selector.
This feature adds per-tenant language management:

- Org Admin enables/disables which languages are available in their organization
- Users of that tenant see only the enabled languages in their LanguageSelector
- All 10 translation files already exist in the codebase (`packages/i18n/src/locales/`) — this is DB toggle only, no deploy needed
- Storage: `tenants.settings` JSONB (column already exists, default `{}`)

## Architecture

```
tenants.settings (JSONB)
  → supportedLanguages: string[]   (default: all 10)
  → defaultLanguage: string        (default: 'en')

TenantLanguageService   ← mirrors TenantBrandingService exactly
  → 5-min TTL LRU cache (500 entries max)
  → getSettings(tenantId)
  → updateSettings(tenantId, input)

GraphQL: myTenantLanguageSettings query (any authenticated user)
         updateTenantLanguageSettings mutation (ORG_ADMIN / SUPER_ADMIN)

Frontend:
  SettingsPage → useTenantLanguageSettings() → LanguageSelector (availableLocales prop)
  /admin/language → LanguageSettingsPage (toggle switches per language)
```

---

## Files to Create

### 1. `apps/subgraph-core/src/tenant/tenant-language.schemas.ts`

Zod validation. Rules:

- `supportedLanguages`: array of known locale strings, min 1, must include `defaultLanguage`
- `defaultLanguage`: must be one of `supportedLanguages`

```ts
const KNOWN_LOCALES = [
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
export const UpdateTenantLanguageSettingsSchema = z
  .object({
    supportedLanguages: z.array(z.enum(KNOWN_LOCALES)).min(1),
    defaultLanguage: z.enum(KNOWN_LOCALES),
  })
  .refine((d) => d.supportedLanguages.includes(d.defaultLanguage), {
    message: 'defaultLanguage must be in supportedLanguages',
  });
```

### 2. `apps/subgraph-core/src/tenant/tenant-language.service.ts`

Mirrors `TenantBrandingService` pattern exactly:

- `import { db, tenants } from '@edusphere/db'`
- `implements OnModuleDestroy` → `this.cache.clear()`
- LRU cache 500 entries / 5-min TTL
- `getSettings(tenantId)`: reads `tenants.settings` JSONB, parses with `parseLanguageSettings()`
- `updateSettings(tenantId, input)`: reads current `settings`, deep-merges language keys, writes back, invalidates cache
- `parseLanguageSettings(raw)`: extracts `supportedLanguages`/`defaultLanguage` with fallback to defaults (all 10 / 'en')

### 3. `apps/subgraph-core/src/tenant/tenant-language.service.spec.ts`

Unit tests:

- `parseLanguageSettings()` with null/empty/partial/full input
- `getSettings()` cache hit / miss
- `updateSettings()` merges only language fields, preserves other tenant settings
- `getSettings()` returns defaults when tenant row has no language settings

### 4. `apps/subgraph-core/src/tenant/tenant-language.service.memory.spec.ts`

Memory test (required per CLAUDE.md for every new service with cache):

- Verify `onModuleDestroy()` calls `cache.clear()`
- Verify LRU eviction fires at `LANG_CACHE_MAX_SIZE`

### 5. `apps/web/src/lib/graphql/tenant-language.queries.ts`

```graphql
query MyTenantLanguageSettings {
  myTenantLanguageSettings {
    supportedLanguages
    defaultLanguage
  }
}
mutation UpdateTenantLanguageSettings(
  $input: UpdateTenantLanguageSettingsInput!
) {
  updateTenantLanguageSettings(input: $input) {
    supportedLanguages
    defaultLanguage
  }
}
```

### 6. `apps/web/src/pages/LanguageSettingsPage.tsx`

Route: `/admin/language` | Access: `ORG_ADMIN`, `SUPER_ADMIN`

Layout:

- Card header: "Language Management"
- Toggle switch row per language (flag + native name + English name)
- Disabled toggle for English (always enabled, cannot remove)
- Radio button / dropdown to set `defaultLanguage` (among enabled ones)
- Save button → calls `updateTenantLanguageSettings` mutation
- Success/error toast

---

## Files to Modify

### 7. `apps/subgraph-core/src/tenant/tenant.graphql`

Add to existing SDL (append after existing `type Query`):

```graphql
type TenantLanguageSettings {
  supportedLanguages: [String!]!
  defaultLanguage: String!
}

input UpdateTenantLanguageSettingsInput {
  supportedLanguages: [String!]!
  defaultLanguage: String!
}

extend type Query {
  myTenantLanguageSettings: TenantLanguageSettings! @authenticated
}

type Mutation {
  updateTenantLanguageSettings(
    input: UpdateTenantLanguageSettingsInput!
  ): TenantLanguageSettings!
    @authenticated
    @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}
```

### 8. `apps/subgraph-core/src/tenant/tenant.resolver.ts`

Add to `TenantResolver`:

```ts
@Query('myTenantLanguageSettings')
async getMyTenantLanguageSettings(@Context() context: GraphQLContext) {
  if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
  return this.tenantLanguageService.getSettings(context.authContext.tenantId || '');
}

@Mutation('updateTenantLanguageSettings')
async updateTenantLanguageSettings(@Args('input') input: unknown, @Context() context: GraphQLContext) {
  if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
  const validated = UpdateTenantLanguageSettingsSchema.parse(input);
  return this.tenantLanguageService.updateSettings(context.authContext.tenantId || '', validated);
}
```

Inject `TenantLanguageService` via constructor.

### 9. `apps/subgraph-core/src/tenant/tenant.module.ts`

Register `TenantLanguageService`:

```ts
providers: [TenantResolver, TenantService, TenantLanguageService],
exports: [TenantService, TenantLanguageService],
```

### 10. `apps/web/src/components/LanguageSelector.tsx`

Add optional prop:

```ts
interface LanguageSelectorProps {
  value: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
  disabled?: boolean;
  availableLocales?: readonly SupportedLocale[]; // ← new, defaults to SUPPORTED_LOCALES
}
```

Replace `SUPPORTED_LOCALES.map(...)` with `(availableLocales ?? SUPPORTED_LOCALES).map(...)`.

### 11. `apps/web/src/hooks/useUserPreferences.ts`

Add second query for tenant language settings. Return `availableLocales` from hook.
If current `locale` is not in `availableLocales`, automatically call `setLocale(defaultLanguage)`.

```ts
const [tenantLangResult] = useQuery({
  query: MY_TENANT_LANGUAGE_SETTINGS_QUERY,
});
const availableLocales = (tenantLangResult.data?.myTenantLanguageSettings
  ?.supportedLanguages ?? SUPPORTED_LOCALES) as SupportedLocale[];
const tenantDefault = (tenantLangResult.data?.myTenantLanguageSettings
  ?.defaultLanguage ?? 'en') as SupportedLocale;

// Auto-fallback: if user's saved locale was disabled by admin, switch to tenant default
useEffect(() => {
  if (
    availableLocales.length > 0 &&
    !availableLocales.includes(currentLocale)
  ) {
    void setLocale(tenantDefault);
  }
}, [availableLocales, currentLocale, tenantDefault, setLocale]);

return {
  locale: currentLocale,
  setLocale,
  isSaving: fetching,
  availableLocales,
};
```

### 12. `apps/web/src/pages/SettingsPage.tsx`

Destructure `availableLocales` from `useUserPreferences()` and pass to `LanguageSelector`:

```tsx
<LanguageSelector value={locale} onChange={...} disabled={isSaving} availableLocales={availableLocales} />
```

### 13. `apps/web/src/lib/router.tsx`

Add lazy import + route:

```ts
const LanguageSettingsPage = lazy(() =>
  import('@/pages/LanguageSettingsPage').then((m) => ({ default: m.LanguageSettingsPage }))
);
// ...
{ path: '/admin/language', element: guarded(<LanguageSettingsPage />) },
```

---

## Critical Constraints

| Rule                                              | How met                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| English (`en`) always enabled                     | Hardcoded in `parseLanguageSettings()` defaults + UI disables its toggle                     |
| `defaultLanguage` must be in `supportedLanguages` | Zod `.refine()` validation                                                                   |
| RLS / tenant isolation                            | Resolver uses `context.authContext.tenantId` — never user-supplied tenant ID                 |
| Only ORG_ADMIN can update                         | `@requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])` directive                                   |
| Memory safety                                     | `OnModuleDestroy` → `cache.clear()` + memory.spec.ts test                                    |
| Backend Zod enum still allows all 10 locales      | `user.schemas.ts` unchanged — backend accepts any known locale, frontend limits what's shown |

---

## Verification

```bash
# 1. Unit tests (new service + memory safety)
npx vitest run apps/subgraph-core/src/tenant/tenant-language.service.spec.ts
npx vitest run apps/subgraph-core/src/tenant/tenant-language.service.memory.spec.ts

# 2. Full core subgraph tests (no regressions)
pnpm --filter @edusphere/subgraph-core test

# 3. TypeScript
pnpm turbo typecheck

# 4. Manual E2E:
#   Login as ORG_ADMIN → /admin/language
#   Disable Spanish (es) → Save
#   Login as regular user → /settings
#   Open language selector → Spanish should NOT appear
#   User who previously had Spanish → auto-switched to tenant defaultLanguage
```

## Note on Plan File Location

Per CLAUDE.md: move to `docs/plans/` inside the project after approval.
