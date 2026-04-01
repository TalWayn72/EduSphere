import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentResolver } from './consent.resolver';

// Mock ConsentService
const mockUpdateConsent = vi.fn().mockResolvedValue(undefined);
const mockConsentService = { updateConsent: mockUpdateConsent } as never;

describe('ConsentResolver', () => {
  let resolver: ConsentResolver;

  beforeEach(() => {
    mockUpdateConsent.mockReset().mockResolvedValue(undefined);
    resolver = new ConsentResolver(mockConsentService);
  });

  it('calls ConsentService.updateConsent with correct params', async () => {
    const context = {
      req: {},
      authContext: { tenantId: 't-1', userId: 'u-1', roles: ['STUDENT'] },
    };
    const result = await resolver.updateConsent(
      { consentType: 'AI_PROCESSING', given: true },
      context
    );
    expect(result).toBe(true);
    expect(mockUpdateConsent).toHaveBeenCalledWith({
      tenantId: 't-1',
      userId: 'u-1',
      consentType: 'AI_PROCESSING',
      given: true,
      method: 'SETTINGS_UI',
    });
  });

  it('throws when authContext is missing', async () => {
    const context = { req: {} };
    await expect(
      resolver.updateConsent(
        { consentType: 'AI_PROCESSING', given: true },
        context
      )
    ).rejects.toThrow('Unauthenticated');
  });

  // BUG-092: missing tenantId must throw instead of causing DB null error
  it('BUG-092: throws when tenantId is missing from auth context', async () => {
    const context = {
      req: {},
      authContext: { userId: 'u-1', roles: ['STUDENT'] },
    };
    await expect(
      resolver.updateConsent(
        { consentType: 'AI_PROCESSING', given: true },
        context
      )
    ).rejects.toThrow('Missing tenant context');
    expect(mockUpdateConsent).not.toHaveBeenCalled();
  });

  // BUG-092: service errors must propagate (not swallowed)
  it('BUG-092: re-throws service errors for GraphQL error response', async () => {
    mockUpdateConsent.mockRejectedValueOnce(new Error('DB constraint'));
    const context = {
      req: {},
      authContext: { tenantId: 't-1', userId: 'u-1', roles: ['STUDENT'] },
    };
    await expect(
      resolver.updateConsent({ consentType: 'ANALYTICS', given: true }, context)
    ).rejects.toThrow('DB constraint');
  });

  // BUG-088 REGRESSION: consent withdrawal (given=false) must also sync
  it('REGRESSION BUG-088: passes given=false for consent withdrawal', async () => {
    const context = {
      req: {},
      authContext: { tenantId: 't-1', userId: 'u-1', roles: ['STUDENT'] },
    };
    await resolver.updateConsent(
      { consentType: 'THIRD_PARTY_LLM', given: false },
      context
    );
    expect(mockUpdateConsent).toHaveBeenCalledWith(
      expect.objectContaining({ consentType: 'THIRD_PARTY_LLM', given: false })
    );
  });
});
