/**
 * EduSphere GraphQL Schema Linting Rules
 *
 * Defines the severity levels for schema governance rules enforced at CI time.
 * "error" rules block PR merges. "warn" rules report only.
 *
 * These rules implement the schema evolution policy documented in:
 * API-CONTRACTS-GRAPHQL-FEDERATION.md §16 (Breaking Change Policy)
 */

export const SCHEMA_LINT_RULES = {
  // ─── Breaking Changes (error: block merge) ──────────────────────────────
  /** Removing a field is always a breaking change */
  FIELD_REMOVED: 'error',
  /** Removing a type is always a breaking change */
  TYPE_REMOVED: 'error',
  /** Removing an argument is a breaking change */
  ARGUMENT_REMOVED: 'error',
  /** Removing an enum value is a breaking change for clients checking exhaustively */
  ENUM_VALUE_REMOVED: 'error',
  /** Changing field type (e.g., String → Int) is breaking */
  FIELD_TYPE_CHANGED: 'error',
  /** Making a field required that was optional is breaking for clients not sending it */
  FIELD_NULLABILITY_CHANGED_TO_NON_NULL: 'error',
  /** Cannot un-deprecate — it breaks clients that have already migrated away */
  FIELD_DEPRECATION_REMOVED: 'error',

  // ─── Safe Additions (warn: report only) ─────────────────────────────────
  /** Adding a new field is safe — clients ignore unknown fields */
  FIELD_ADDED: 'warn',
  /** Adding a new type is safe */
  TYPE_ADDED: 'warn',
  /** Adding a new enum value may affect exhaustive switch statements (warn) */
  ENUM_VALUE_ADDED: 'warn',
  /** Adding @deprecated signals upcoming removal (requires 90-day notice) */
  FIELD_DEPRECATION_ADDED: 'warn',
  /** Adding a new optional argument is safe */
  OPTIONAL_ARGUMENT_ADDED: 'warn',
  /** Changing field description is non-breaking */
  FIELD_DESCRIPTION_CHANGED: 'warn',
} as const;

export type SchemaLintRule = keyof typeof SCHEMA_LINT_RULES;
export type SchemaLintSeverity = (typeof SCHEMA_LINT_RULES)[SchemaLintRule];

/**
 * Returns the severity level for a given schema lint rule.
 * Used by CI scripts to determine if a schema change should block or warn.
 */
export function getRuleSeverity(rule: SchemaLintRule): SchemaLintSeverity {
  return SCHEMA_LINT_RULES[rule];
}

/**
 * Returns all rules that are classified as errors (blocking changes).
 */
export function getBlockingRules(): SchemaLintRule[] {
  return (Object.keys(SCHEMA_LINT_RULES) as SchemaLintRule[]).filter(
    (rule) => SCHEMA_LINT_RULES[rule] === 'error'
  );
}

/**
 * Returns all rules that are classified as warnings (informational only).
 */
export function getWarningRules(): SchemaLintRule[] {
  return (Object.keys(SCHEMA_LINT_RULES) as SchemaLintRule[]).filter(
    (rule) => SCHEMA_LINT_RULES[rule] === 'warn'
  );
}
