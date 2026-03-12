/**
 * HrisIntegrationService unit tests — Phase 52
 */
import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HrisIntegrationService } from './hris-integration.service.js';
import { ScimAdapter } from './scim.adapter.js';
import { WorkdayAdapter } from './workday.adapter.js';
import { SapAdapter } from './sap.adapter.js';
import { BannerAdapter } from './banner.adapter.js';
import type { HrisConfig } from './hris-adapter.interface.js';

function makeService() {
  const scim = new ScimAdapter();
  const workday = new WorkdayAdapter();
  const sap = new SapAdapter();
  const banner = new BannerAdapter();
  const service = new HrisIntegrationService(scim, workday, sap, banner);
  return { service, scim, workday, sap, banner };
}

describe('HrisIntegrationService', () => {
  it('getAdapter("SCIM") returns ScimAdapter', () => {
    const { service, scim } = makeService();
    expect(service.getAdapter('SCIM')).toBe(scim);
  });

  it('getAdapter("WORKDAY") returns WorkdayAdapter', () => {
    const { service, workday } = makeService();
    expect(service.getAdapter('WORKDAY')).toBe(workday);
  });

  it('getAdapter("SAP") returns SapAdapter', () => {
    const { service, sap } = makeService();
    expect(service.getAdapter('SAP')).toBe(sap);
  });

  it('getAdapter("BANNER") returns BannerAdapter', () => {
    const { service, banner } = makeService();
    expect(service.getAdapter('BANNER')).toBe(banner);
  });

  it('getAdapter throws NotFoundException for unknown type', () => {
    const { service } = makeService();
    expect(() => service.getAdapter('ADP')).toThrow(NotFoundException);
  });

  it('getSupportedSystems returns array with 4 items', () => {
    const { service } = makeService();
    const systems = service.getSupportedSystems();
    expect(systems).toHaveLength(4);
    expect(systems).toContain('SCIM');
    expect(systems).toContain('WORKDAY');
    expect(systems).toContain('SAP');
    expect(systems).toContain('BANNER');
  });

  it('testConnection delegates to adapter', async () => {
    const { service, scim } = makeService();
    vi.spyOn(scim, 'testConnection').mockResolvedValueOnce(true);

    const config: HrisConfig = {
      type: 'SCIM',
      baseUrl: 'https://scim.example.com',
      clientSecret: 'token',
      tenantId: 'tenant-001',
    };
    const result = await service.testConnection(config);
    expect(result).toBe(true);
    expect(scim.testConnection).toHaveBeenCalledWith(config);
  });

  it('syncTenant delegates to adapter syncUsers', async () => {
    const { service, scim } = makeService();
    const mockResult = { usersUpserted: 5, usersDeactivated: 1, groupsSynced: 2, errors: [] };
    vi.spyOn(scim, 'syncUsers').mockResolvedValueOnce(mockResult);

    const config: HrisConfig = {
      type: 'SCIM',
      baseUrl: 'https://scim.example.com',
      clientSecret: 'token',
      tenantId: 'tenant-001',
    };
    const result = await service.syncTenant(config);
    expect(result).toEqual(mockResult);
    expect(scim.syncUsers).toHaveBeenCalledWith(config, 'tenant-001');
  });

  it('onModuleDestroy completes without error', () => {
    const { service } = makeService();
    expect(() => service.onModuleDestroy()).not.toThrow();
  });
});
