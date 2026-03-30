import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { KeycloakAdminHttpService } from './keycloak-admin-http.service';

describe('KeycloakAdminHttpService', () => {
  let service: KeycloakAdminHttpService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KEYCLOAK_URL = 'http://kc:8080';
    process.env.KEYCLOAK_REALM = 'test-realm';
    process.env.KEYCLOAK_CLIENT_ID = 'test-client';
    process.env.KEYCLOAK_CLIENT_SECRET = 'secret123';
    service = new KeycloakAdminHttpService();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.KEYCLOAK_URL;
    delete process.env.KEYCLOAK_REALM;
    delete process.env.KEYCLOAK_CLIENT_ID;
    delete process.env.KEYCLOAK_CLIENT_SECRET;
  });

  describe('adminBase', () => {
    it('constructs admin base URL from env vars', () => {
      expect(service.adminBase).toBe('http://kc:8080/admin/realms/test-realm');
    });
  });

  describe('getToken', () => {
    it('fetches a new token from Keycloak', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'new-token',
          expires_in: 300,
        }),
      }) as any;
      const token = await service.getToken();
      expect(token).toBe('new-token');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns cached token if not expired', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'cached-tok',
          expires_in: 600,
        }),
      }) as any;
      await service.getToken();
      const token2 = await service.getToken();
      expect(token2).toBe('cached-tok');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('findGroupByName', () => {
    it('returns matching group', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 300 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([
            { id: 'g1', name: 'Admins' },
            { id: 'g2', name: 'Students' },
          ]),
        }) as any;
      const group = await service.findGroupByName('Admins');
      expect(group).toEqual({ id: 'g1', name: 'Admins' });
    });

    it('returns null when no group matches', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 300 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([]),
        }) as any;
      const group = await service.findGroupByName('NonExistent');
      expect(group).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('returns the first matched user', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 300 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([
            { id: 'u1', email: 'a@b.com', enabled: true },
          ]),
        }) as any;
      const user = await service.findUserByEmail('a@b.com');
      expect(user).toEqual({ id: 'u1', email: 'a@b.com', enabled: true });
    });

    it('returns null when no user matches', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 300 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([]),
        }) as any;
      const user = await service.findUserByEmail('none@b.com');
      expect(user).toBeNull();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('calls Keycloak execute-actions-email endpoint', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 300 }),
        })
        .mockResolvedValueOnce({ ok: true }) as any;
      await service.sendPasswordResetEmail('user-123');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      const secondCall = (globalThis.fetch as any).mock.calls[1];
      expect(secondCall[0]).toContain('user-123/execute-actions-email');
      expect(secondCall[1].method).toBe('PUT');
    });
  });

  describe('fetchWithRetry', () => {
    it('retries on 500 errors up to MAX_RETRIES', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('err') })
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('err') })
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('err') }) as any;
      await expect(
        service.fetchWithRetry('http://kc:8080/test', {})
      ).rejects.toThrow(InternalServerErrorException);
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    it('returns immediately on 409 (conflict)', async () => {
      const response = { ok: false, status: 409 };
      globalThis.fetch = vi.fn().mockResolvedValue(response) as any;
      const res = await service.fetchWithRetry('http://kc:8080/test', {});
      expect(res).toBe(response);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on network errors', async () => {
      globalThis.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({ ok: true }) as any;
      const res = await service.fetchWithRetry('http://kc:8080/test', {});
      expect((res as any).ok).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('onModuleDestroy', () => {
    it('clears access token on destroy', async () => {
      (service as any).accessToken = 'some-token';
      await service.onModuleDestroy();
      expect((service as any).accessToken).toBeNull();
    });
  });
});
