/**
 * HRIS Adapter contract — Phase 52
 * All HRIS system adapters MUST implement this interface.
 * Adapter pattern: one adapter per HRIS system.
 */
export interface HrisUser {
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  jobTitle?: string;
  managerId?: string;
  isActive: boolean;
}

export interface HrisGroup {
  externalId: string;
  name: string;
  memberIds: string[];
}

export interface HrisSyncResult {
  usersUpserted: number;
  usersDeactivated: number;
  groupsSynced: number;
  errors: string[];
}

export interface HrisConfig {
  type: 'WORKDAY' | 'SAP' | 'BANNER' | 'SCIM' | 'ADP';
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  tenantId: string;
  fieldMapping?: Record<string, string>;
}

export interface IHrisAdapter {
  readonly type: HrisConfig['type'];
  /** Test connectivity to the HRIS system */
  testConnection(config: HrisConfig): Promise<boolean>;
  /** Fetch all active users from HRIS */
  fetchUsers(config: HrisConfig): Promise<HrisUser[]>;
  /** Fetch all groups/departments from HRIS */
  fetchGroups(config: HrisConfig): Promise<HrisGroup[]>;
  /** Sync users to EduSphere (upsert in users table) */
  syncUsers(config: HrisConfig, tenantId: string): Promise<HrisSyncResult>;
}
