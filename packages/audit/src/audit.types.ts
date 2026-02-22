export type AuditAction =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'CONSENT_GIVEN'
  | 'CONSENT_WITHDRAWN'
  | 'DATA_ERASURE'
  | 'RETENTION_CLEANUP';

export type AuditResourceType =
  | 'USER'
  | 'ANNOTATION'
  | 'COURSE'
  | 'AGENT_SESSION'
  | 'AGENT_MESSAGE'
  | 'FILE'
  | 'CONSENT';

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'DENIED';

export interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  action: AuditAction | string;
  resourceType?: AuditResourceType | string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
}
