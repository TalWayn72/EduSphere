import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockNc } = vi.hoisted(() => {
  const mockDb = { update: vi.fn() };
  const mockNc = {
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false),
  };
  return { mockDb, mockNc };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    tenants: { id: 'id', settings: 'settings' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...vals: unknown[]) => ({
      sql: strings,
      vals,
    })),
    { raw: vi.fn((a: unknown) => ({ sqlRaw: a })) }
  ),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue(mockNc),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => new TextEncoder().encode(s)),
  })),
}));
vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

import { OrgProvisioningHelpersService } from './org-provisioning-helpers.service';
import type { ProvisioningSteps } from './org-provisioning.types';

describe('OrgProvisioningHelpersService', () => {
  let service: OrgProvisioningHelpersService;

  const defaultInput = {
    name: 'Acme Corp',
    slug: 'acme-corp',
    adminEmail: 'admin@acme.com',
    adminFirstName: 'John',
    adminLastName: 'Doe',
    idempotencyKey: 'idem-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrgProvisioningHelpersService();
  });

  describe('updateProvisioningSteps', () => {
    it('updates tenant settings with provisioning steps', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      const steps: ProvisioningSteps = { step1_slug_validated: true };
      await service.updateProvisioningSteps('tenant-1', steps);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('emitProvisionedEvent', () => {
    it('publishes org.provisioned event via NATS', async () => {
      await service.emitProvisionedEvent('tenant-1', defaultInput);
      expect(mockNc.publish).toHaveBeenCalledWith(
        'EDUSPHERE.org.provisioned',
        expect.any(Uint8Array)
      );
    });

    it('does not throw when NATS publish fails', async () => {
      mockNc.publish.mockImplementationOnce(() => {
        throw new Error('NATS down');
      });
      await expect(
        service.emitProvisionedEvent('tenant-1', defaultInput)
      ).resolves.toBeUndefined();
    });
  });

  describe('emitWelcomeEmail', () => {
    it('publishes notification.dispatch event', async () => {
      await service.emitWelcomeEmail('tenant-1', defaultInput);
      expect(mockNc.publish).toHaveBeenCalledWith(
        'EDUSPHERE.notification.dispatch',
        expect.any(Uint8Array)
      );
    });

    it('does not throw when NATS publish fails', async () => {
      mockNc.publish.mockImplementationOnce(() => {
        throw new Error('NATS down');
      });
      await expect(
        service.emitWelcomeEmail('tenant-1', defaultInput)
      ).resolves.toBeUndefined();
    });
  });

  describe('compensatingSaga', () => {
    it('marks tenant as FAILED when step2 was completed', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      const steps: ProvisioningSteps = {
        step1_slug_validated: true,
        step2_tenant_created: true,
      };
      await service.compensatingSaga('tenant-1', steps);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('does nothing when step2 was not completed', async () => {
      const steps: ProvisioningSteps = { step1_slug_validated: true };
      await service.compensatingSaga('tenant-1', steps);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('does not throw when compensation fails', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      });
      const steps: ProvisioningSteps = { step2_tenant_created: true };
      await expect(
        service.compensatingSaga('tenant-1', steps)
      ).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('drains NATS and closes pools', async () => {
      // Trigger NATS initialization by calling a method that uses getNats
      await service.emitProvisionedEvent('t1', defaultInput);
      await service.onModuleDestroy();
      expect(mockNc.drain).toHaveBeenCalled();
    });

    it('handles destroy when NATS was never initialized', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
