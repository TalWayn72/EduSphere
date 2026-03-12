import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: { openBadgeAssertions: {} },
  eq: vi.fn(),
  withTenantContext: vi.fn(),
}));

import { BadgeIssuerService } from './badge-issuer.service.js';
import { closeAllPools } from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

const CTX: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT',
};

describe('BadgeIssuerService', () => {
  let service: BadgeIssuerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BadgeIssuerService();
  });

  it('issueBadge returns a VC with correct @context array', async () => {
    const vc = await service.issueBadge('user-1', 'course-1', CTX);

    expect(vc['@context']).toEqual([
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ]);
  });

  it('issueBadge VC type array contains VerifiableCredential and OpenBadgeCredential', async () => {
    const vc = await service.issueBadge('user-1', 'course-1', CTX);

    expect(vc.type).toContain('VerifiableCredential');
    expect(vc.type).toContain('OpenBadgeCredential');
  });

  it('issueBadge sets issuer to did:web:edusphere.ai', async () => {
    const vc = await service.issueBadge('user-1', 'course-1', CTX);

    expect(vc.issuer).toBe('did:web:edusphere.ai');
  });

  it('verifyBadge returns true for a freshly issued badge', async () => {
    const vc = await service.issueBadge('user-1', 'course-1', CTX);

    expect(service.verifyBadge(vc)).toBe(true);
  });

  it('verifyBadge returns false when proofValue is tampered', async () => {
    const vc = await service.issueBadge('user-1', 'course-1', CTX);
    const tampered = {
      ...vc,
      proof: { ...vc.proof, proofValue: 'tampered-invalid-hash' },
    };

    expect(service.verifyBadge(tampered)).toBe(false);
  });

  it('onModuleDestroy calls closeAllPools', () => {
    service.onModuleDestroy();

    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });
});
