/**
 * Course & Badge Events
 *
 * Covers: course enrollment (F-031 Instructor Marketplace),
 * course completion (F-027 CPD/CE Credit Tracking),
 * OpenBadge 3.0 (F-025 Micro-Credentials)
 */

// ─── Course Enrolled Events ──────────────────────────────────────────────────

export interface CourseEnrolledPayload {
  readonly courseId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly purchaseId: string;
  readonly timestamp: string; // ISO 8601
}

export function isCourseEnrolledEvent(e: unknown): e is CourseEnrolledPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['courseId'] === 'string' &&
    typeof obj['userId'] === 'string' &&
    typeof obj['purchaseId'] === 'string'
  );
}

// ─── Course Completion Events ────────────────────────────────────────────────

export interface CourseCompletedPayload {
  readonly courseId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly completionDate: string; // ISO 8601
  readonly certificateId?: string;
  readonly courseTitle?: string;
  readonly courseCategory?: string;
  readonly estimatedHours?: number;
}

export function isCourseCompletedEvent(
  e: unknown
): e is CourseCompletedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['courseId'] === 'string' &&
    typeof obj['userId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['completionDate'] === 'string'
  );
}

// ─── OpenBadge 3.0 Events ───────────────────────────────────────────────────

export interface BadgeIssuedPayload {
  readonly assertionId: string;
  readonly badgeDefinitionId: string;
  readonly recipientId: string;
  readonly tenantId: string;
  readonly badgeName: string;
  readonly verifyUrl: string;
  readonly timestamp: string; // ISO 8601
}

export interface BadgeRevokedPayload {
  readonly assertionId: string;
  readonly tenantId: string;
  readonly reason: string;
  readonly timestamp: string; // ISO 8601
}

export function isBadgeIssuedEvent(e: unknown): e is BadgeIssuedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assertionId'] === 'string' &&
    typeof obj['recipientId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['badgeName'] === 'string'
  );
}

export function isBadgeRevokedEvent(e: unknown): e is BadgeRevokedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assertionId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['reason'] === 'string'
  );
}
