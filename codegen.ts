import type { CodegenConfig } from '@graphql-codegen/cli';

const SCALAR_CONFIG = {
  // Domain scalars
  DateTime: 'string',
  JSON: 'unknown',
  JSONObject: 'Record<string, unknown>',
  UUID: 'string',
  URL: 'string',
  PositiveInt: 'number',
  NonNegativeInt: 'number',
  Base64: 'string',
  Cursor: 'string',
  EmailAddress: 'string',
  UnitFloat: 'number',
  ID: 'string',
  // Federation v2 internal scalars present in the composed supergraph SDL.
  // These are never queried by client operations; mapping them to string
  // prevents "Unknown scalar" errors during codegen.
  join__FieldSet: 'string',
  link__Import: 'string',
  requiresScopes__Scope: 'string',
} as const;

const config: CodegenConfig = {
  schema: 'apps/gateway/supergraph.graphql',
  documents: [
    'apps/web/src/lib/graphql/**/*.ts',
    // translation.queries.ts references contentTranslation / requestContentTranslation
    // which do not yet exist in the composed supergraph.  Exclude until the
    // content-translation feature is added to the schema.
    '!apps/web/src/lib/graphql/translation.queries.ts',
    // Exclude barrel re-export file (not a document file).
    '!apps/web/src/lib/graphql/index.ts',
    // ── Tier-3 + Admin features ──────────────────────────────────────────────
    // These query files reference types added to subgraph SDLs after the last
    // supergraph composition. They use manually-typed interfaces so they do NOT
    // need generated types. Exclude until compose.js is re-run with live services.
    //
    // Agent tier-3 (course generator — not yet in supergraph):
    '!apps/web/src/lib/graphql/agent-course-gen.queries.ts',
    // Content tier-3 (analytics, microlearning, at-risk, scenarios, admin enrollment):
    '!apps/web/src/lib/graphql/content-tier3.queries.ts',
    // Knowledge tier-3 (skill gap, social feed):
    '!apps/web/src/lib/graphql/knowledge-tier3.queries.ts',
    //
    // Admin (Phase-2):
    '!apps/web/src/lib/graphql/admin-gamification.queries.ts',
    '!apps/web/src/lib/graphql/admin-language.queries.ts',
    '!apps/web/src/lib/graphql/admin-notifications.queries.ts',
    '!apps/web/src/lib/graphql/admin-roles.queries.ts',
    '!apps/web/src/lib/graphql/admin-roles.permissions.ts',
    '!apps/web/src/lib/graphql/announcements.queries.ts',
    '!apps/web/src/lib/graphql/audit.queries.ts',
    '!apps/web/src/lib/graphql/branding.queries.ts',
    '!apps/web/src/lib/graphql/security.queries.ts',
    // Tier-3 feature modules (subgraph not yet composed into supergraph):
    '!apps/web/src/lib/graphql/assessment.queries.ts',
    '!apps/web/src/lib/graphql/badge.queries.ts',
    '!apps/web/src/lib/graphql/bi-export.queries.ts',
    '!apps/web/src/lib/graphql/competency.queries.ts',
    '!apps/web/src/lib/graphql/compliance.queries.ts',
    '!apps/web/src/lib/graphql/cpd.queries.ts',
    '!apps/web/src/lib/graphql/crm.queries.ts',
    '!apps/web/src/lib/graphql/gamification.queries.ts',
    '!apps/web/src/lib/graphql/library.queries.ts',
    '!apps/web/src/lib/graphql/live-session.queries.ts',
    '!apps/web/src/lib/graphql/portal.queries.ts',
    '!apps/web/src/lib/graphql/profile.queries.ts',
    '!apps/web/src/lib/graphql/programs.queries.ts',
    '!apps/web/src/lib/graphql/roleplay.queries.ts',
    '!apps/web/src/lib/graphql/scim.queries.ts',
    '!apps/web/src/lib/graphql/scorm.queries.ts',
    '!apps/web/src/lib/graphql/sources.queries.ts',
    '!apps/web/src/lib/graphql/srs.queries.ts',
    '!apps/web/src/lib/graphql/tenant-language.queries.ts',
    '!apps/web/src/lib/graphql/xapi.queries.ts',
  ],
  generates: {
    'packages/graphql-types/src/generated/types.ts': {
      plugins: ['typescript'],
      config: {
        scalars: SCALAR_CONFIG,
        strictScalars: true,
        enumsAsTypes: false,
        skipTypename: false,
        avoidOptionals: false,
        nonOptionalTypename: false,
        // Federation supergraph SDL uses internal join__ / link__ directives;
        // treating it as valid SDL avoids parse-time validation errors.
        assumeValidSDL: true,
      },
    },
    'packages/graphql-types/src/generated/operations.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        scalars: SCALAR_CONFIG,
        strictScalars: true,
        skipTypename: false,
        dedupeOperationSuffix: true,
        preResolveTypes: true,
        assumeValidSDL: true,
      },
    },
  },
};

export default config;
