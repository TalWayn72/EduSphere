/**
 * ScimSettings — shared types.
 */

export const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export interface ScimToken {
  id: string;
  description: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ScimSyncEntry {
  id: string;
  operation: string;
  externalId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}
