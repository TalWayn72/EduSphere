/**
 * SCIM 2.0 Adapter — RFC 7643/7644
 * Generic adapter that works with any HRIS system supporting SCIM 2.0.
 * Compatible with: Workday, Okta, Azure AD, BambooHR, ADP, and more.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { IHrisAdapter, HrisConfig, HrisUser, HrisGroup, HrisSyncResult } from './hris-adapter.interface.js';

interface ScimListResponse<T> {
  totalResults: number;
  Resources: T[];
}

interface ScimUserResource {
  id: string;
  externalId?: string;
  active: boolean;
  emails?: Array<{ value: string; primary?: boolean }>;
  name?: { givenName?: string; familyName?: string };
  title?: string;
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: {
    department?: string;
    manager?: { value?: string };
  };
}

interface ScimGroupResource {
  id: string;
  externalId?: string;
  displayName: string;
  members?: Array<{ value: string }>;
}

function buildHeaders(config: HrisConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.clientSecret ?? ''}`,
    'Content-Type': 'application/scim+json',
    Accept: 'application/scim+json',
  };
}

@Injectable()
export class ScimAdapter implements IHrisAdapter {
  readonly type = 'SCIM' as const;
  private readonly logger = new Logger(ScimAdapter.name);

  async testConnection(config: HrisConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl}/ServiceProviderConfig`, {
        headers: buildHeaders(config),
        signal: AbortSignal.timeout(10_000),
      });
      return response.status === 200;
    } catch (err) {
      this.logger.error({ err }, 'ScimAdapter: testConnection failed');
      return false;
    }
  }

  async fetchUsers(config: HrisConfig): Promise<HrisUser[]> {
    try {
      const url = `${config.baseUrl}/Users?filter=active%20eq%20true&count=1000`;
      const response = await fetch(url, {
        headers: buildHeaders(config),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        this.logger.error({ status: response.status }, 'ScimAdapter: fetchUsers request failed');
        return [];
      }
      const data = (await response.json()) as ScimListResponse<ScimUserResource>;
      return (data.Resources ?? []).map((r) => this.mapScimUser(r));
    } catch (err) {
      this.logger.error({ err }, 'ScimAdapter: fetchUsers error');
      return [];
    }
  }

  async fetchGroups(config: HrisConfig): Promise<HrisGroup[]> {
    try {
      const url = `${config.baseUrl}/Groups?count=1000`;
      const response = await fetch(url, {
        headers: buildHeaders(config),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        this.logger.error({ status: response.status }, 'ScimAdapter: fetchGroups request failed');
        return [];
      }
      const data = (await response.json()) as ScimListResponse<ScimGroupResource>;
      return (data.Resources ?? []).map((g) => ({
        externalId: g.externalId ?? g.id,
        name: g.displayName,
        memberIds: (g.members ?? []).map((m) => m.value),
      }));
    } catch (err) {
      this.logger.error({ err }, 'ScimAdapter: fetchGroups error');
      return [];
    }
  }

  async syncUsers(config: HrisConfig, tenantId: string): Promise<HrisSyncResult> {
    const errors: string[] = [];
    let usersUpserted = 0;

    try {
      const users = await this.fetchUsers(config);
      this.logger.log({ tenantId, count: users.length }, 'ScimAdapter: syncUsers fetched users');
      usersUpserted = users.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`ScimAdapter syncUsers error: ${msg}`);
      this.logger.error({ tenantId, err }, 'ScimAdapter: syncUsers failed');
    }

    return { usersUpserted, usersDeactivated: 0, groupsSynced: 0, errors };
  }

  private mapScimUser(r: ScimUserResource): HrisUser {
    const enterprise = r['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];
    const primaryEmail = r.emails?.find((e) => e.primary)?.value ?? r.emails?.[0]?.value ?? '';
    return {
      externalId: r.externalId ?? r.id,
      email: primaryEmail,
      firstName: r.name?.givenName ?? '',
      lastName: r.name?.familyName ?? '',
      department: enterprise?.department,
      jobTitle: r.title,
      managerId: enterprise?.manager?.value,
      isActive: r.active,
    };
  }
}
