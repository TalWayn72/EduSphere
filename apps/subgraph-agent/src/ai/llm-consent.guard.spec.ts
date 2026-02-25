import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { LlmConsentGuard } from './llm-consent.guard.js';

vi.mock('@edusphere/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'consent-1', given: true }]),
      }),
    }),
  },
  userConsents: { userId: 'userId', consentType: 'consentType', given: 'given' },
}));


describe('LlmConsentGuard', () => {
  let guard: LlmConsentGuard;

  beforeEach(() => {
    guard = new LlmConsentGuard();
    vi.clearAllMocks();
  });

  it('assertConsent does not throw when consent exists', async () => {
    await expect(guard.assertConsent('user-1', true)).resolves.not.toThrow();
  });

  it('assertConsent throws CONSENT_REQUIRED when no consent', async () => {
    const { db } = await import('@edusphere/db');
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as ReturnType<typeof db.select>);

    await expect(guard.assertConsent('user-1', true)).rejects.toThrow(GraphQLError);
  });

  it('throws with CONSENT_REQUIRED extension code', async () => {
    const { db } = await import('@edusphere/db');
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as ReturnType<typeof db.select>);

    try {
      await guard.assertConsent('user-1', false);
    } catch (e) {
      expect(e).toBeInstanceOf(GraphQLError);
      expect((e as GraphQLError).extensions?.code).toBe('CONSENT_REQUIRED');
    }
  });

  it('hasConsent returns true when consent exists', async () => {
    expect(await guard.hasConsent('user-1', true)).toBe(true);
  });

  it('hasConsent returns false when no consent', async () => {
    const { db } = await import('@edusphere/db');
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as ReturnType<typeof db.select>);

    expect(await guard.hasConsent('user-1', true)).toBe(false);
  });
});
