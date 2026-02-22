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
  'join__FieldSet': 'string',
  'link__Import': 'string',
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
