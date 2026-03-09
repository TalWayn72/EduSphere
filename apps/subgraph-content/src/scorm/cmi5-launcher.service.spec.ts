import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cmi5LauncherService, CMI5_VERBS } from './cmi5-launcher.service';

const mockStoreStatement = vi.fn().mockResolvedValue(undefined);
const mockXapiService = { storeStatement: mockStoreStatement };

describe('Cmi5LauncherService', () => {
  let service: Cmi5LauncherService;

  const params = {
    activityId: 'https://example.com/course/1',
    actor: { name: 'Alice', mbox: 'alice@example.com' },
    registration: '550e8400-e29b-41d4-a716-446655440000',
    returnURL: 'https://lms.example.com/return',
    sessionId: '660e8400-e29b-41d4-a716-446655440000',
    tenantId: 'tenant-abc',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new Cmi5LauncherService(mockXapiService as never);
  });

  describe('emitStatement', () => {
    it('calls xapiStatementService.storeStatement with tenantId', async () => {
      await service.emitStatement('launched', params);
      expect(mockStoreStatement).toHaveBeenCalledTimes(1);
      expect(mockStoreStatement).toHaveBeenCalledWith('tenant-abc', expect.any(Object));
    });

    it('builds statement with correct verb id for launched', async () => {
      await service.emitStatement('launched', params);
      const stmt = mockStoreStatement.mock.calls[0][1] as Record<string, unknown>;
      expect((stmt.verb as Record<string, string>).id).toBe(CMI5_VERBS.launched);
    });

    it('builds statement with correct verb id for terminated', async () => {
      await service.emitStatement('terminated', params);
      const stmt = mockStoreStatement.mock.calls[0][1] as Record<string, unknown>;
      expect((stmt.verb as Record<string, string>).id).toBe(CMI5_VERBS.terminated);
    });

    it('includes sessionId in context extensions', async () => {
      await service.emitStatement('initialized', params);
      const stmt = mockStoreStatement.mock.calls[0][1] as Record<string, unknown>;
      const ctx = stmt.context as Record<string, unknown>;
      const extensions = ctx.extensions as Record<string, string>;
      expect(extensions['https://adlnet.gov/expapi/cmi5/context/sessionId']).toBe(params.sessionId);
    });

    it('merges extra extensions into context', async () => {
      await service.emitStatement('passed', params, { 'https://example.com/score': 0.9 });
      const stmt = mockStoreStatement.mock.calls[0][1] as Record<string, unknown>;
      const ctx = stmt.context as Record<string, unknown>;
      const extensions = ctx.extensions as Record<string, unknown>;
      expect(extensions['https://example.com/score']).toBe(0.9);
    });

    it('does not throw when storeStatement rejects', async () => {
      mockStoreStatement.mockRejectedValueOnce(new Error('DB error'));
      await expect(service.emitStatement('launched', params)).resolves.not.toThrow();
    });

    it('sets actor mbox with mailto: prefix', async () => {
      await service.emitStatement('launched', params);
      const stmt = mockStoreStatement.mock.calls[0][1] as Record<string, unknown>;
      const actor = stmt.actor as Record<string, string>;
      expect(actor.mbox).toBe('mailto:alice@example.com');
    });
  });

  describe('isSatisfied', () => {
    it('Passed mode requires passed=true', () => {
      expect(service.isSatisfied({ mode: 'Passed' }, true, true)).toBe(true);
      expect(service.isSatisfied({ mode: 'Passed' }, true, false)).toBe(false);
      expect(service.isSatisfied({ mode: 'Passed' }, false, false)).toBe(false);
    });

    it('Completed mode requires completed=true', () => {
      expect(service.isSatisfied({ mode: 'Completed' }, true, false)).toBe(true);
      expect(service.isSatisfied({ mode: 'Completed' }, false, true)).toBe(false);
    });

    it('CompletedAndPassed requires both true', () => {
      expect(service.isSatisfied({ mode: 'CompletedAndPassed' }, true, true)).toBe(true);
      expect(service.isSatisfied({ mode: 'CompletedAndPassed' }, true, false)).toBe(false);
      expect(service.isSatisfied({ mode: 'CompletedAndPassed' }, false, true)).toBe(false);
    });

    it('CompletedOrPassed satisfies when either is true', () => {
      expect(service.isSatisfied({ mode: 'CompletedOrPassed' }, true, false)).toBe(true);
      expect(service.isSatisfied({ mode: 'CompletedOrPassed' }, false, true)).toBe(true);
      expect(service.isSatisfied({ mode: 'CompletedOrPassed' }, false, false)).toBe(false);
    });

    it('NotApplicable always returns true', () => {
      expect(service.isSatisfied({ mode: 'NotApplicable' }, false, false)).toBe(true);
    });
  });

  describe('buildLaunchUrl', () => {
    it('appends required cmi5 query params', () => {
      const url = service.buildLaunchUrl(
        'https://au.example.com/course',
        params,
        'https://lrs.example.com/xapi',
      );
      const parsed = new URL(url);
      expect(parsed.searchParams.get('registration')).toBe(params.registration);
      expect(parsed.searchParams.get('activityId')).toBe(params.activityId);
      expect(parsed.searchParams.get('endpoint')).toBe('https://lrs.example.com/xapi');
    });
  });

  describe('CMI5_VERBS', () => {
    it('defines all 9 required verbs', () => {
      const required = [
        'launched', 'initialized', 'terminated', 'passed',
        'failed', 'completed', 'satisfied', 'waived', 'abandoned',
      ] as const;
      for (const verb of required) {
        // eslint-disable-next-line security/detect-object-injection -- verb is from const literal array
        expect(CMI5_VERBS[verb]).toBeTruthy();
      }
    });
  });
});
