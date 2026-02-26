import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import * as crypto from 'crypto';
import type {
  LtiClaims,
  LtiLoginRequest,
  LtiPlatformConfig,
  LtiStatePayload,
  LtiPlatformDto,
  RegisterLtiPlatformInput,
} from './lti.types';

// ── In-memory state store (replace with Redis in production) ──────────────────
// Keyed by state token; values expire after TTL_MS.
const STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface StateEntry {
  payload: LtiStatePayload;
  expiresAt: number;
}

// ── LtiService ────────────────────────────────────────────────────────────────

@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);

  /**
   * In-memory state store with bounded size (max 10 000 pending states).
   * In a multi-instance deployment this MUST be replaced with a shared Redis
   * store using the same key prefix and TTL.
   */
  private readonly stateStore = new Map<string, StateEntry>();
  private readonly MAX_STATES = 10_000;

  // ── Platform config (from environment) ─────────────────────────────────────

  getPlatformConfig(issuer?: string): LtiPlatformConfig {
    const cfgIssuer = process.env['LTI_PLATFORM_ISSUER'] ?? '';
    if (issuer && issuer !== cfgIssuer) {
      throw new UnauthorizedException(`Unknown LTI platform issuer: ${issuer}`);
    }
    return {
      issuer: cfgIssuer,
      clientId: process.env['LTI_PLATFORM_CLIENT_ID'] ?? '',
      authEndpoint: process.env['LTI_PLATFORM_AUTH_ENDPOINT'] ?? '',
      jwksUri: process.env['LTI_PLATFORM_JWKS_URL'] ?? '',
    };
  }

  // ── State / nonce management ─────────────────────────────────────────────────

  /**
   * Persist state + nonce for CSRF protection during the login flow.
   * Evicts the oldest entry when the store is full (LRU by insertion order).
   */
  async storeState(
    state: string,
    nonce: string,
    loginHint: string
  ): Promise<void> {
    this.evictExpiredStates();
    if (this.stateStore.size >= this.MAX_STATES) {
      const oldestKey = this.stateStore.keys().next().value;
      if (oldestKey !== undefined) {
        this.stateStore.delete(oldestKey);
      }
    }
    const payload: LtiStatePayload = {
      nonce,
      loginHint,
      createdAt: new Date().toISOString(),
    };
    this.stateStore.set(state, {
      payload,
      expiresAt: Date.now() + STATE_TTL_MS,
    });
    this.logger.debug({ state }, 'LTI state stored');
  }

  /**
   * Retrieve and delete a stored state (one-time use).
   * Returns null if the state is missing or expired.
   */
  async consumeState(state: string): Promise<LtiStatePayload | null> {
    const entry = this.stateStore.get(state);
    if (!entry) return null;
    this.stateStore.delete(state);
    if (Date.now() > entry.expiresAt) {
      this.logger.warn({ state }, 'LTI state expired');
      return null;
    }
    return entry.payload;
  }

  private evictExpiredStates(): void {
    const now = Date.now();
    for (const [key, entry] of this.stateStore) {
      if (now > entry.expiresAt) this.stateStore.delete(key);
    }
  }

  // ── OIDC authentication URL builder ──────────────────────────────────────────

  buildAuthUrl(body: LtiLoginRequest, state: string, nonce: string): string {
    const platform = this.getPlatformConfig(body.iss);
    const toolBaseUrl = process.env['TOOL_BASE_URL'] ?? 'http://localhost:4002';
    const redirectUri = `${toolBaseUrl}/lti/launch`;

    const params = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      client_id: body.client_id ?? platform.clientId,
      redirect_uri: redirectUri,
      login_hint: body.login_hint,
      state,
      nonce,
      response_mode: 'form_post',
      prompt: 'none',
    });

    if (body.lti_message_hint) {
      params.set('lti_message_hint', body.lti_message_hint);
    }

    return `${platform.authEndpoint}?${params.toString()}`;
  }

  // ── JWT launch validation ─────────────────────────────────────────────────────

  /**
   * Validate the id_token JWT from the platform:
   *  1. Fetch the platform's public keys via JWKS URI.
   *  2. Verify the JWT signature and standard claims.
   *  3. Verify nonce matches the stored state (one-time use, then deleted).
   */
  async validateLaunch(idToken: string, state: string): Promise<LtiClaims> {
    // Retrieve and consume the stored state (deletes it — one-time use)
    const storedState = await this.consumeState(state);
    if (!storedState) {
      throw new UnauthorizedException(
        'LTI state missing, expired, or already used'
      );
    }

    const platform = this.getPlatformConfig();

    // Build a remote JWKS verifier from the platform's JWKS URI
    const JWKS = createRemoteJWKSet(new URL(platform.jwksUri));

    let claims: LtiClaims;
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: platform.issuer,
        audience: platform.clientId,
      });
      claims = payload as unknown as LtiClaims;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err: msg }, 'LTI id_token verification failed');
      throw new UnauthorizedException(
        `LTI id_token verification failed: ${msg}`
      );
    }

    // Verify nonce (one-time use — prevents replay attacks)
    if (claims.nonce !== storedState.nonce) {
      throw new UnauthorizedException('LTI nonce mismatch');
    }

    // Verify LTI version
    const ltiVersion =
      claims['https://purl.imsglobal.org/spec/lti/claim/version'];
    if (ltiVersion !== '1.3.0') {
      throw new BadRequestException(`Unsupported LTI version: ${ltiVersion}`);
    }

    this.logger.log(
      { sub: claims.sub, iss: claims.iss },
      'LTI launch validated'
    );
    return claims;
  }

  // ── Deep-link target URL resolver ────────────────────────────────────────────

  /**
   * Map the LTI resource_link or target_link_uri to an EduSphere frontend URL.
   *
   * Resolution order:
   *  1. Custom `edusphere_content_id` parameter → /learn/:contentId
   *  2. Custom `edusphere_course_id` parameter → /courses/:courseId
   *  3. Context id (course identifier in the platform) → /courses/:contextId
   *  4. Resource link id → /courses/:resourceLinkId
   *  5. Target link URI (as-is from the platform) if it starts with /
   *  6. Fallback → /dashboard
   */
  resolveTargetUrl(claims: LtiClaims): string {
    const custom = claims['https://purl.imsglobal.org/spec/lti/claim/custom'];
    const resourceLink =
      claims['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    const context = claims['https://purl.imsglobal.org/spec/lti/claim/context'];
    const targetLinkUri =
      claims['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'];

    if (custom?.['edusphere_content_id']) {
      return `/learn/${custom['edusphere_content_id']}`;
    }
    if (custom?.['edusphere_course_id']) {
      return `/courses/${custom['edusphere_course_id']}`;
    }
    if (context?.id) {
      return `/courses/${context.id}`;
    }
    if (resourceLink?.id) {
      return `/courses/${resourceLink.id}`;
    }
    // If the platform set a path-only target link URI use it directly
    if (targetLinkUri?.startsWith('/')) {
      return targetLinkUri;
    }
    return '/dashboard';
  }

  // ── Session token creation ────────────────────────────────────────────────────

  /**
   * Create a short-lived opaque session token that the frontend can exchange
   * for a real auth session.  In production this would be a signed JWT or a
   * Redis-backed one-time token.  Here we return a random hex token so tests
   * can verify the shape without real crypto infrastructure.
   */
  createSession(claims: LtiClaims): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.logger.debug({ sub: claims.sub }, 'LTI session token created');
    return token;
  }

  // ── Tool JWKS ─────────────────────────────────────────────────────────────────

  /**
   * Return the tool's public JWKS so the platform can verify messages signed
   * by the tool (used in deep linking and Assignment and Grade Services).
   *
   * In production, load the private key from LTI_TOOL_PRIVATE_KEY env var and
   * derive the public JWK.  Here we return an empty keyset as a safe default
   * when no key is configured.
   */
  getToolJwks(): Record<string, unknown> {
    const privateKeyPem = process.env['LTI_TOOL_PRIVATE_KEY'];
    if (!privateKeyPem) {
      this.logger.warn(
        'LTI_TOOL_PRIVATE_KEY not configured — returning empty JWKS'
      );
      return { keys: [] };
    }
    try {
      const keyObject = crypto.createPrivateKey(privateKeyPem);
      const publicKey = crypto.createPublicKey(keyObject);
      const jwk = publicKey.export({ format: 'jwk' }) as Record<
        string,
        unknown
      >;
      // Add key metadata required by LTI spec
      jwk['use'] = 'sig';
      jwk['alg'] = 'RS256';
      jwk['kid'] = 'edusphere-lti-key-1';
      return { keys: [jwk] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({ err: msg }, 'Failed to export tool public JWKS');
      return { keys: [] };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // ── Platform management (env-config stubs — replace with DB in production) ─

  /** Returns the configured LTI platform as a DTO (env-based, single-platform). */
  async getPlatforms(tenantId: string): Promise<LtiPlatformDto[]> {
    const cfg = this.getPlatformConfig();
    if (!cfg.issuer) return [];
    return [
      {
        id: `env-${tenantId}`,
        tenantId,
        platformName: 'LMS Platform',
        platformUrl: cfg.issuer,
        clientId: cfg.clientId,
        authLoginUrl: cfg.authEndpoint,
        authTokenUrl: cfg.authEndpoint,
        keySetUrl: cfg.jwksUri,
        deploymentId: process.env['LTI_DEPLOYMENT_ID'] ?? '',
        isActive: true,
      },
    ];
  }

  /** Registers an LTI platform (stored in env for single-tenant; use DB for multi-tenant). */
  async registerPlatform(
    tenantId: string,
    input: RegisterLtiPlatformInput
  ): Promise<LtiPlatformDto> {
    return {
      id: `env-${tenantId}-${Date.now()}`,
      tenantId,
      ...input,
      isActive: true,
    };
  }

  /** Toggles an LTI platform's active state (no-op for env-backed config). */
  async togglePlatform(
    id: string,
    tenantId: string,
    isActive: boolean
  ): Promise<LtiPlatformDto> {
    const platforms = await this.getPlatforms(tenantId);
    const platform = platforms[0];
    if (!platform) {
      throw new BadRequestException(`LTI platform ${id} not found`);
    }
    return { ...platform, id, isActive };
  }
}
