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
export function toUserRole(role: string | null | undefined): TenantContext['userRole'] {
  if (role && VALID_ROLES.has(role)) return role as TenantContext['userRole'];
  return 'STUDENT';
}

/** Shape of a Concept vertex as returned by Apache AGE graph queries. */
export interface GraphConceptNode {
  id: string;
  tenant_id: string;
  name: string;
  definition?: string;
  source_ids?: string;
  created_at: number | string;
  updated_at: number | string;
}

/** Shape of a generic related-concept row from findRelatedConcepts. */
export interface RelatedConceptRow extends GraphConceptNode {
  strength?: number;
}
