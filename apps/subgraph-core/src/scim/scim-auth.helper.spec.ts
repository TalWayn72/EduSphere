/**
 * scim-auth.helper.spec.ts — Unit tests for ScimAuthHelper.
 * Covers: scimError response formatting, authorize with valid/invalid tokens.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpStatus } from '@nestjs/common';

const mockValidateToken = vi.fn();

vi.mock('./scim-token.service.js', () => {
  return {
    ScimTokenService: class MockScimTokenService {
      validateToken = mockValidateToken;
    },
  };
});

import { ScimAuthHelper } from './scim-auth.helper';
import { ScimTokenService } from './scim-token.service.js';

function createMockRes() {
  const json = vi.fn();
  const type = vi.fn().mockReturnValue({ json });
  const status = vi.fn().mockReturnValue({ type, json });
  return { status, type, json } as unknown as {
    status: ReturnType<typeof vi.fn>;
    type: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

function createMockReq(authHeader?: string) {
  return {
    headers: { authorization: authHeader },
  } as unknown as import('express').Request;
}

describe('ScimAuthHelper', () => {
  let helper: ScimAuthHelper;

  beforeEach(() => {
    vi.clearAllMocks();
    const tokenService = new ScimTokenService() as InstanceType<
      typeof ScimTokenService
    >;
    helper = new ScimAuthHelper(tokenService);
  });

  describe('scimError', () => {
    it('should send SCIM-formatted error response', () => {
      const res = createMockRes();
      helper.scimError(res as never, 404, 'Not found');

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('authorize', () => {
    it('should return null and 401 when no auth header', async () => {
      const req = createMockReq(undefined);
      const res = createMockRes();

      const result = await helper.authorize(req, res as never);
      expect(result).toBeNull();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('should return null when auth header is not Bearer', async () => {
      const req = createMockReq('Basic abc123');
      const res = createMockRes();

      const result = await helper.authorize(req, res as never);
      expect(result).toBeNull();
    });

    it('should return null when token is invalid', async () => {
      mockValidateToken.mockResolvedValue(null);
      const req = createMockReq('Bearer invalid-token');
      const res = createMockRes();

      const result = await helper.authorize(req, res as never);
      expect(result).toBeNull();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('should return tenant/token info on valid Bearer token', async () => {
      mockValidateToken.mockResolvedValue({ tenantId: 't1', tokenId: 'tok1' });
      const req = createMockReq('Bearer valid-token');
      const res = createMockRes();

      const result = await helper.authorize(req, res as never);
      expect(result).toEqual({ tenantId: 't1', tokenId: 'tok1' });
      expect(mockValidateToken).toHaveBeenCalledWith('valid-token');
    });
  });
});
