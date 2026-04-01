/**
 * Shared types and helpers for the graph service layer.
 * Eliminates `role as any` casts by providing a validated role coercion helper.
 */
import type { TenantContext } from '@edusphere/db';

const VALID_ROLES = new Set<string>([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
  'STUDENT',
  'RESEARCHER',
]);

/**
 * Coerce an unknown role string to TenantContext['userRole'].
 * Falls back to 'STUDENT' when the value is absent or unrecognised.
 */
export function toUserRole(
  role: string | null | undefined
): TenantContext['userRole'] {
  if (role && VALID_ROLES.has(role)) return role as TenantContext['userRole'];
  return 'STUDENT';
}

/**
 * Safely convert an Apache AGE timestamp value to an ISO string.
 * AGE may return: epoch millis (number), ISO string, or invalid values
 * (e.g. the literal string "timestamp()" from a JSON.stringify bug).
 * Returns the current time as fallback when the value is unparseable.
 */
export function safeIsoDate(value: number | string | null | undefined): string {
  if (value == null) return new Date().toISOString();
  const d = new Date(
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  );
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/** Shape of a Concept vertex as returned by Apache AGE graph queries. */
export interface GraphConceptNode {
  id: string;
  tenant_id: string;
  name: string;
  definition?: string;
  source_ids?: string;
  created_at: number | string | null;
  updated_at: number | string | null;
}

/** Shape of a generic related-concept row from findRelatedConcepts. */
export interface RelatedConceptRow extends GraphConceptNode {
  strength?: number;
}
