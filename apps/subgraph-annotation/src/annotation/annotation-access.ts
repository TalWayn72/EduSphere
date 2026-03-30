import { sql } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

export type AnnotationLayer = 'PERSONAL' | 'SHARED' | 'INSTRUCTOR' | 'AI_GENERATED';
export type AnnotationType =
  | 'TEXT'
  | 'SKETCH'
  | 'LINK'
  | 'BOOKMARK'
  | 'SPATIAL_COMMENT'
  | 'INLINE_COMMENT'
  | 'SUGGESTION';

export interface TextRange {
  start: number;
  end: number;
  rangeType?: string;
}

export interface CreateAnnotationInput {
  assetId: string;
  annotationType: AnnotationType;
  layer?: AnnotationLayer;
  content: Record<string, unknown>;
  spatialData?: Record<string, unknown> | null;
  textRange?: TextRange | null;
  parentId?: string;
}

export interface UpdateAnnotationInput {
  content?: unknown;
  spatialData?: unknown;
  isResolved?: boolean;
}

const INSTRUCTOR_ROLES = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'];

export function isInstructorRole(authContext: AuthContext): boolean {
  const userRole = authContext.roles[0] || 'STUDENT';
  return INSTRUCTOR_ROLES.includes(userRole);
}

/**
 * Builds SQL visibility conditions for annotation layer-based access control.
 * Returns an array of SQL fragments to be ANDed with other conditions.
 */
export function buildLayerVisibilityConditions(
  annotations: { layer: unknown; user_id: unknown },
  authContext: AuthContext,
  layer?: string
): ReturnType<typeof sql>[] {
  const conditions: ReturnType<typeof sql>[] = [];
  const isInstructor = isInstructorRole(authContext);

  if (layer) {
    conditions.push(sql`${annotations.layer} = ${layer}`);
    if (layer === 'PERSONAL') {
      // PERSONAL layer only visible to owner
      conditions.push(sql`${annotations.user_id} = ${authContext.userId}`);
    }
  } else if (isInstructor) {
    // Instructors see everything except others' PERSONAL annotations
    conditions.push(
      sql`(${annotations.layer} != 'PERSONAL' OR ${annotations.user_id} = ${authContext.userId})`
    );
  } else {
    // Students see SHARED, INSTRUCTOR, AI_GENERATED, and own PERSONAL
    conditions.push(
      sql`(${annotations.layer} IN ('SHARED', 'INSTRUCTOR', 'AI_GENERATED') OR (${annotations.layer} = 'PERSONAL' AND ${annotations.user_id} = ${authContext.userId}))`
    );
  }

  return conditions;
}
