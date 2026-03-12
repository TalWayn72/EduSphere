/**
 * Banner (Ellucian) Adapter stub — Phase 52
 * Uses Ellucian Banner REST API for higher education institutions.
 * Full implementation requires Banner API key and institution-specific configuration.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { IHrisAdapter, HrisConfig, HrisUser, HrisGroup, HrisSyncResult } from './hris-adapter.interface.js';

@Injectable()
export class BannerAdapter implements IHrisAdapter {
  readonly type = 'BANNER' as const;
  private readonly logger = new Logger(BannerAdapter.name);

  async testConnection(config: HrisConfig): Promise<boolean> {
    try {
      const url = `${config.baseUrl}/api/v1/persons?max=1`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.clientSecret ?? ''}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok;
    } catch (err) {
      this.logger.error({ err }, 'BannerAdapter: testConnection failed');
      return false;
    }
  }

  async fetchUsers(config: HrisConfig): Promise<HrisUser[]> {
    this.logger.warn(
      { tenantId: config.tenantId },
      'Banner adapter: stub implementation — fetchUsers returns empty array'
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
      errors: ['Banner adapter: full sync requires Ellucian Banner API credentials'],
    };
  }
}
