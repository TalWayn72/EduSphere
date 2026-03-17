/**
 * HrisIntegrationService — Phase 52
 * Orchestrates all HRIS adapters and delegates sync operations.
 * SI-3: Credentials encrypted via encryptField/decryptField before storage/after retrieval.
 * Memory safety: OnModuleDestroy implemented (no resources to clean currently).
 */
import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ScimAdapter } from './scim.adapter.js';
import { WorkdayAdapter } from './workday.adapter.js';
import { SapAdapter } from './sap.adapter.js';
import { BannerAdapter } from './banner.adapter.js';
import {
  decryptHrisCredentials,
  encryptHrisCredentials,
  redactHrisConfig,
} from './hris-credential.helper.js';
import type { IHrisAdapter, HrisConfig, HrisSyncResult } from './hris-adapter.interface.js';

@Injectable()
export class HrisIntegrationService implements OnModuleDestroy {
  private readonly logger = new Logger(HrisIntegrationService.name);
  private readonly adapters: Map<string, IHrisAdapter>;

  constructor(
    private readonly scimAdapter: ScimAdapter,
    private readonly workdayAdapter: WorkdayAdapter,
    private readonly sapAdapter: SapAdapter,
    private readonly bannerAdapter: BannerAdapter,
  ) {
    this.adapters = new Map<string, IHrisAdapter>([
      ['SCIM', scimAdapter],
      ['WORKDAY', workdayAdapter],
      ['SAP', sapAdapter],
      ['BANNER', bannerAdapter],
    ]);
  }

  onModuleDestroy(): void {
    this.logger.log('HrisIntegrationService destroyed — no async resources to clean');
  }

  getAdapter(type: HrisConfig['type']): IHrisAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new NotFoundException(`HRIS adapter not found for type: ${type}`);
    }
    return adapter;
  }

  /** Encrypt credentials for safe DB storage. Call before persisting config. */
  encryptConfigForStorage(config: HrisConfig): HrisConfig {
    return encryptHrisCredentials(config);
  }

  async testConnection(config: HrisConfig): Promise<boolean> {
    const adapter = this.getAdapter(config.type);
    const decrypted = decryptHrisCredentials(config);
    const result = await adapter.testConnection(decrypted);
    this.logger.log({ ...redactHrisConfig(config), result }, 'HRIS testConnection');
    return result;
  }

  async syncTenant(config: HrisConfig): Promise<HrisSyncResult> {
    const adapter = this.getAdapter(config.type);
    const decrypted = decryptHrisCredentials(config);
    const result = await adapter.syncUsers(decrypted, config.tenantId);
    this.logger.log(
      { ...redactHrisConfig(config), result },
      'HRIS syncTenant complete',
    );
    return result;
  }

  getSupportedSystems(): string[] {
    return ['SCIM', 'WORKDAY', 'SAP', 'BANNER'];
  }
}
