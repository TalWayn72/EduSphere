/**
 * SAP SuccessFactors Adapter stub — Phase 52
 * Uses SAP SuccessFactors OData REST API.
 * Full implementation requires SAP API credentials and OData v2 client.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { IHrisAdapter, HrisConfig, HrisUser, HrisGroup, HrisSyncResult } from './hris-adapter.interface.js';

@Injectable()
export class SapAdapter implements IHrisAdapter {
  readonly type = 'SAP' as const;
  private readonly logger = new Logger(SapAdapter.name);

  async testConnection(config: HrisConfig): Promise<boolean> {
    try {
      const url = `${config.baseUrl}/odata/v2/User?$format=json&$top=1`;
      const credentials = Buffer.from(
        `${config.clientId ?? ''}:${config.clientSecret ?? ''}`
      ).toString('base64');
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok;
    } catch (err) {
      this.logger.error({ err }, 'SapAdapter: testConnection failed');
      return false;
    }
  }

  async fetchUsers(config: HrisConfig): Promise<HrisUser[]> {
    this.logger.warn(
      { tenantId: config.tenantId },
      'SAP adapter: stub implementation — fetchUsers returns empty array'
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
      errors: ['SAP adapter: full sync requires SAP SuccessFactors API credentials'],
    };
  }
}
