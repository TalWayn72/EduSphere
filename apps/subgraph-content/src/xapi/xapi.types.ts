/**
 * xAPI 1.0.3 type definitions — F-028 xAPI / LRS Integration
 */

export interface XapiActor {
  objectType: 'Agent';
  name: string;
  mbox: string;
}

export interface XapiVerb {
  id: string;
  display: Record<string, string>;
}

export interface XapiObjectDefinition {
  name: Record<string, string>;
}

export interface XapiObject {
  objectType: 'Activity';
  id: string;
  definition: XapiObjectDefinition;
}

export interface XapiResult {
  score?: { scaled?: number; raw?: number };
  completion?: boolean;
  success?: boolean;
  duration?: string;
}

export interface XapiContext {
  platform?: string;
  language?: string;
  extensions?: Record<string, unknown>;
}

export interface XapiStatement {
  id: string; // UUID
  actor: XapiActor;
  verb: XapiVerb;
  object: XapiObject;
  result?: XapiResult;
  context?: XapiContext;
  timestamp?: string; // ISO 8601
  stored?: string; // ISO 8601
}

export interface XapiQueryParams {
  limit?: number;
  since?: string; // ISO 8601
  until?: string; // ISO 8601
  verb?: string;
  agent?: string;
}

// ─── Verb URIs (xAPI 1.0.3 standard) ────────────────────────────────────────

export const XAPI_VERBS = {
  COMPLETED: 'http://adlnet.gov/expapi/verbs/completed',
  LAUNCHED: 'http://adlnet.gov/expapi/verbs/launched',
  VIEWED: 'http://id.tincanapi.com/verb/viewed',
  PASSED: 'http://adlnet.gov/expapi/verbs/passed',
  FAILED: 'http://adlnet.gov/expapi/verbs/failed',
  ANNOTATED: 'http://risc-inc.com/annotator/verbs/annotated',
  FOLLOWED: 'http://activitystrea.ms/schema/1.0/follow',
} as const;

export type XapiVerbId = (typeof XAPI_VERBS)[keyof typeof XAPI_VERBS];

// ─── NATS subject → verb mapping ─────────────────────────────────────────────

export const SUBJECT_TO_VERB: Record<string, XapiVerbId> = {
  'EDUSPHERE.course.completed': XAPI_VERBS.COMPLETED,
  'EDUSPHERE.course.started': XAPI_VERBS.LAUNCHED,
  'EDUSPHERE.content.viewed': XAPI_VERBS.VIEWED,
  'EDUSPHERE.quiz.passed': XAPI_VERBS.PASSED,
  'EDUSPHERE.quiz.failed': XAPI_VERBS.FAILED,
  'EDUSPHERE.annotation.created': XAPI_VERBS.ANNOTATED,
  'EDUSPHERE.user.followed': XAPI_VERBS.FOLLOWED,
};

export interface MappableNatsPayload {
  userId: string;
  tenantId: string;
  courseId?: string;
  contentItemId?: string;
  annotationId?: string;
  followingId?: string;
  courseTitle?: string;
}
