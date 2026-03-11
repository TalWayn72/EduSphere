/**
 * Workday Adapter stub — Phase 52
 * Full implementation requires Workday ISU (Integration System User) credentials.
 * Stub provides type-safe structure for future implementation.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { IHrisAdapter, HrisConfig, HrisUser, HrisGroup, HrisSyncResult } from './hris-adapter.interface.js';

@Injectable()
export class WorkdayAdapter implements IHrisAdapter {
  readonly type = 'WORKDAY' as const;
  private readonly logger = new Logger(WorkdayAdapter.name);

  async testConnection(config: HrisConfig): Promise<boolean> {
    try {
      const credentials = Buffer.from(
        `${config.clientId ?? ''}:${config.clientSecret ?? ''}`
      ).toString('base64');
      const url = `${config.baseUrl}/ccx/service/customreport2/${config.clientId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok;
    } catch (err) {
      this.logger.error({ err }, 'WorkdayAdapter: testConnection failed');
      return false;
    }
  }

  async fetchUsers(config: HrisConfig): Promise<HrisUser[]> {
    this.logger.warn(
      { tenantId: config.tenantId },
      'Workday adapter: stub implementation — fetchUsers returns empty array'
    );
    return [];
  }

  async fetchGroups(_config: HrisConfig): Promise<HrisGroup[]> {
    return [];
  }

  async syncUsers(_config: HrisConfig, _tenantId: string): Promise<HrisSyncResult> {
    return {
      usersUpserted: 0,
      usersDeactivated: 0,
      groupsSynced: 0,
      errors: ['Workday adapter: full sync requires Workday ISU credentials'],
    };
  }
}
