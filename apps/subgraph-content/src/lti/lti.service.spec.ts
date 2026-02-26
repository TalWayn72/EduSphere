import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { LtiService } from './lti.service';
import type { LtiClaims, LtiLoginRequest } from './lti.types';

// ── jose mock ─────────────────────────────────────────────────────────────────
// We mock the jose library so tests do not need a real JWKS server.
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}));

import { jwtVerify, createRemoteJWKSet } from 'jose';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClaims(overrides: Partial<LtiClaims> = {}): LtiClaims {
  return {
    sub: 'user-42',
    iss: 'https://canvas.instructure.com',
    aud: 'client-abc',
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
    nonce: 'test-nonce',
    'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
    'https://purl.imsglobal.org/spec/lti/claim/message_type':
      'LtiResourceLinkRequest',
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
    'https://purl.imsglobal.org/spec/lti/claim/target_link_uri':
      'https://tool.example.com/launch',
    'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
      id: 'resource-99',
    },
    'https://purl.imsglobal.org/spec/lti/claim/roles': [
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
    ],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LtiService', () => {
  let service: LtiService;

  beforeEach(() => {
    service = new LtiService();
    // Reset env vars before each test
    process.env['LTI_PLATFORM_ISSUER'] = 'https://canvas.instructure.com';
    process.env['LTI_PLATFORM_CLIENT_ID'] = 'client-abc';
    process.env['LTI_PLATFORM_AUTH_ENDPOINT'] =
      'https://canvas.instructure.com/api/lti/authorize_redirect';
    process.env['LTI_PLATFORM_JWKS_URL'] =
      'https://canvas.instructure.com/api/lti/security/jwks';
    process.env['TOOL_BASE_URL'] = 'http://localhost:4002';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── storeState / consumeState ──────────────────────────────────────────────

  describe('storeState + consumeState', () => {
    it('stores state and returns the payload on first consume', async () => {
      await service.storeState('state-1', 'nonce-1', 'hint-1');
      const result = await service.consumeState('state-1');
      expect(result).not.toBeNull();
      expect(result?.nonce).toBe('nonce-1');
      expect(result?.loginHint).toBe('hint-1');
    });

    it('returns null for an unknown state key', async () => {
      const result = await service.consumeState('no-such-state');
      expect(result).toBeNull();
    });

    it('deletes the state after the first consume (one-time use)', async () => {
      await service.storeState('state-otu', 'nonce-otu', 'hint-otu');
      await service.consumeState('state-otu');
      const second = await service.consumeState('state-otu');
      expect(second).toBeNull();
    });

    it('stores createdAt timestamp in the payload', async () => {
      const before = new Date().toISOString();
      await service.storeState('state-ts', 'nonce-ts', 'hint-ts');
      const result = await service.consumeState('state-ts');
      expect(result?.createdAt).toBeDefined();
      expect(result!.createdAt >= before).toBe(true);
    });
  });

  // ── buildAuthUrl ───────────────────────────────────────────────────────────

  describe('buildAuthUrl', () => {
    const loginBody: LtiLoginRequest = {
      iss: 'https://canvas.instructure.com',
      login_hint: 'user-hint',
      target_link_uri: 'https://tool.example.com/launch',
    };

    it('builds URL pointing to the platform auth endpoint', () => {
      const url = service.buildAuthUrl(loginBody, 'state-x', 'nonce-x');
      expect(url).toContain(
        'https://canvas.instructure.com/api/lti/authorize_redirect'
      );
    });

    it('includes required OIDC params: scope=openid', () => {
      const url = service.buildAuthUrl(loginBody, 'state-x', 'nonce-x');
      expect(url).toContain('scope=openid');
    });

    it('includes response_type=id_token', () => {
      const url = service.buildAuthUrl(loginBody, 'state-x', 'nonce-x');
      expect(url).toContain('response_type=id_token');
    });

    it('includes response_mode=form_post', () => {
      const url = service.buildAuthUrl(loginBody, 'state-x', 'nonce-x');
      expect(url).toContain('response_mode=form_post');
    });

    it('includes client_id from env when body does not provide one', () => {
      const url = service.buildAuthUrl(loginBody, 'state-x', 'nonce-x');
      expect(url).toContain('client_id=client-abc');
    });

    it('uses client_id from body when provided', () => {
      const url = service.buildAuthUrl(
        { ...loginBody, client_id: 'override-id' },
        'state-x',
        'nonce-x'
      );
      expect(url).toContain('client_id=override-id');
    });

    it('includes state and nonce params', () => {
      const url = service.buildAuthUrl(loginBody, 'my-state', 'my-nonce');
      expect(url).toContain('state=my-state');
      expect(url).toContain('nonce=my-nonce');
    });

    it('includes redirect_uri pointing to /lti/launch', () => {
      const url = service.buildAuthUrl(loginBody, 'state-x', 'nonce-x');
      expect(url).toContain(
        encodeURIComponent('http://localhost:4002/lti/launch')
      );
    });

    it('appends lti_message_hint when provided', () => {
      const url = service.buildAuthUrl(
        { ...loginBody, lti_message_hint: 'msg-hint' },
        'state-x',
        'nonce-x'
      );
      expect(url).toContain('lti_message_hint=msg-hint');
    });

    it('throws UnauthorizedException for unknown issuer', () => {
      expect(() =>
        service.buildAuthUrl(
          { ...loginBody, iss: 'https://unknown.lms.example.com' },
          'state-x',
          'nonce-x'
        )
      ).toThrow(UnauthorizedException);
    });
  });

  // ── validateLaunch ─────────────────────────────────────────────────────────

  describe('validateLaunch', () => {
    it('returns validated claims on success', async () => {
      const claims = makeClaims({ nonce: 'launch-nonce' });
      vi.mocked(jwtVerify).mockResolvedValueOnce({ payload: claims } as never);

      await service.storeState('launch-state', 'launch-nonce', 'hint');
      const result = await service.validateLaunch('fake-token', 'launch-state');

      expect(result.sub).toBe('user-42');
    });

    it('calls createRemoteJWKSet with the configured JWKS URI', async () => {
      const claims = makeClaims({ nonce: 'nonce-jwks' });
      vi.mocked(jwtVerify).mockResolvedValueOnce({ payload: claims } as never);

      await service.storeState('state-jwks', 'nonce-jwks', 'hint');
      await service.validateLaunch('token', 'state-jwks');

      expect(createRemoteJWKSet).toHaveBeenCalledWith(
        new URL('https://canvas.instructure.com/api/lti/security/jwks')
      );
    });

    it('throws UnauthorizedException when state is missing', async () => {
      await expect(
        service.validateLaunch('token', 'nonexistent-state')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when JWT verification fails', async () => {
      vi.mocked(jwtVerify).mockRejectedValueOnce(
        new Error('signature invalid')
      );

      await service.storeState('state-bad-jwt', 'nonce-bad', 'hint');
      await expect(
        service.validateLaunch('bad-token', 'state-bad-jwt')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when nonce does not match', async () => {
      const claims = makeClaims({ nonce: 'wrong-nonce' });
      vi.mocked(jwtVerify).mockResolvedValueOnce({ payload: claims } as never);

      await service.storeState(
        'state-nonce-mismatch',
        'expected-nonce',
        'hint'
      );
      await expect(
        service.validateLaunch('token', 'state-nonce-mismatch')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException for unsupported LTI version', async () => {
      const claims = makeClaims({
        nonce: 'nonce-version',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.1.0',
      });
      vi.mocked(jwtVerify).mockResolvedValueOnce({ payload: claims } as never);

      await service.storeState('state-version', 'nonce-version', 'hint');
      await expect(
        service.validateLaunch('token', 'state-version')
      ).rejects.toThrow(BadRequestException);
    });

    it('consumes state after a successful launch (prevents replay)', async () => {
      const claims = makeClaims({ nonce: 'once-nonce' });
      vi.mocked(jwtVerify).mockResolvedValue({ payload: claims } as never);

      await service.storeState('once-state', 'once-nonce', 'hint');
      await service.validateLaunch('token', 'once-state');

      // Second attempt must fail — state was deleted
      await expect(
        service.validateLaunch('token', 'once-state')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── resolveTargetUrl ───────────────────────────────────────────────────────

  describe('resolveTargetUrl', () => {
    it('maps resource_link.id to /courses/:id', () => {
      const claims = makeClaims({
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
          id: 'course-42',
        },
      });
      expect(service.resolveTargetUrl(claims)).toBe('/courses/course-42');
    });

    it('returns /dashboard as fallback when resource_link has no id', () => {
      const claims = makeClaims({
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: '' },
        'https://purl.imsglobal.org/spec/lti/claim/context': undefined,
      });
      expect(service.resolveTargetUrl(claims)).toBe('/dashboard');
    });

    it('prefers custom edusphere_content_id over resource_link', () => {
      const claims = makeClaims({
        'https://purl.imsglobal.org/spec/lti/claim/custom': {
          edusphere_content_id: 'content-77',
        },
      });
      expect(service.resolveTargetUrl(claims)).toBe('/learn/content-77');
    });

    it('prefers custom edusphere_course_id over resource_link when no content id', () => {
      const claims = makeClaims({
        'https://purl.imsglobal.org/spec/lti/claim/custom': {
          edusphere_course_id: 'course-55',
        },
      });
      expect(service.resolveTargetUrl(claims)).toBe('/courses/course-55');
    });

    it('uses context.id when present and no custom params', () => {
      const claims = makeClaims({
        'https://purl.imsglobal.org/spec/lti/claim/context': { id: 'ctx-33' },
      });
      expect(service.resolveTargetUrl(claims)).toBe('/courses/ctx-33');
    });

    it('uses a path-only target_link_uri as-is when no other identifiers', () => {
      const claims = makeClaims({
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: '' },
        'https://purl.imsglobal.org/spec/lti/claim/context': undefined,
        'https://purl.imsglobal.org/spec/lti/claim/target_link_uri':
          '/courses/path-course',
      });
      expect(service.resolveTargetUrl(claims)).toBe('/courses/path-course');
    });

    it('falls back to /dashboard for absolute target_link_uri (prevents open-redirect)', () => {
      const claims = makeClaims({
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: '' },
        'https://purl.imsglobal.org/spec/lti/claim/context': undefined,
        'https://purl.imsglobal.org/spec/lti/claim/target_link_uri':
          'https://evil.example.com',
      });
      expect(service.resolveTargetUrl(claims)).toBe('/dashboard');
    });
  });

  // ── generateState / generateNonce ─────────────────────────────────────────

  describe('generateState / generateNonce', () => {
    it('generates a 32-character hex state string', () => {
      const state = service.generateState();
      expect(state).toMatch(/^[0-9a-f]{32}$/);
    });

    it('generates a 32-character hex nonce string', () => {
      const nonce = service.generateNonce();
      expect(nonce).toMatch(/^[0-9a-f]{32}$/);
    });

    it('generates unique values on each call', () => {
      const states = new Set(
        Array.from({ length: 10 }, () => service.generateState())
      );
      expect(states.size).toBe(10);
    });
  });

  // ── createSession ──────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('returns a 64-character hex token', () => {
      const claims = makeClaims();
      const token = service.createSession(claims);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns a unique token on each call', () => {
      const claims = makeClaims();
      const tokens = new Set(
        Array.from({ length: 5 }, () => service.createSession(claims))
      );
      expect(tokens.size).toBe(5);
    });
  });

  // ── getToolJwks ────────────────────────────────────────────────────────────

  describe('getToolJwks', () => {
    it('returns empty keys array when LTI_TOOL_PRIVATE_KEY is not set', () => {
      delete process.env['LTI_TOOL_PRIVATE_KEY'];
      const jwks = service.getToolJwks();
      expect(jwks).toEqual({ keys: [] });
    });

    it('returns empty keys array when LTI_TOOL_PRIVATE_KEY is invalid', () => {
      process.env['LTI_TOOL_PRIVATE_KEY'] = 'not-a-real-pem';
      const jwks = service.getToolJwks();
      expect(jwks).toEqual({ keys: [] });
    });
  });
});
