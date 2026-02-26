<<<<<<< HEAD
/**
 * LtiService — core LTI 1.3 OIDC login + callback + platform management.
 * Memory-safe: bounded nonce Map (max 1000 LRU), OnModuleDestroy closes DB pools.
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  eq,
  and,
} from '@edusphere/db';
import type {
  LtiLaunchParams,
  LtiIdToken,
  LtiPlatformDto,
  RegisterLtiPlatformInput,
  LtiLoginRedirect,
  LtiCallbackResult,
} from './lti.types';

const MAX_NONCES = 1000;
const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface NonceEntry {
  state: string;
  createdAt: number;
}

@Injectable()
export class LtiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LtiService.name);
  private readonly db = createDatabaseConnection();
  private readonly nonceMap = new Map<string, NonceEntry>();

  onModuleInit(): void {
    this.logger.log('LtiService initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('LtiService destroyed — DB pools closed');
  }

  private storeNonce(nonce: string, state: string): void {
    if (this.nonceMap.size >= MAX_NONCES) {
      const oldest = this.nonceMap.keys().next().value;
      if (oldest !== undefined) this.nonceMap.delete(oldest);
    }
    this.nonceMap.set(nonce, { state, createdAt: Date.now() });
  }

  private consumeNonce(nonce: string, state: string): boolean {
    const entry = this.nonceMap.get(nonce);
    if (!entry) return false;
    this.nonceMap.delete(nonce);
    if (Date.now() - entry.createdAt > NONCE_TTL_MS) return false;
    return entry.state === state;
  }

  async registerPlatform(
    tenantId: string,
    input: RegisterLtiPlatformInput
  ): Promise<LtiPlatformDto> {
    const [row] = await this.db
      .insert(schema.ltiPlatforms)
      .values({ tenant_id: tenantId, ...this.inputToRow(input) })
      .returning();
    if (!row) throw new Error('Failed to insert LTI platform');
    this.logger.log(
      'LTI platform registered id=' + row.id + ' tenant=' + tenantId
    );
    return this.rowToDto(row);
  }

  async getPlatforms(tenantId: string): Promise<LtiPlatformDto[]> {
    const rows = await this.db
      .select()
      .from(schema.ltiPlatforms)
      .where(
        and(
          eq(schema.ltiPlatforms.tenant_id, tenantId),
          eq(schema.ltiPlatforms.is_active, true)
        )
      );
    return rows.map((r) => this.rowToDto(r));
  }

  async togglePlatform(
    id: string,
    tenantId: string,
    isActive: boolean
  ): Promise<LtiPlatformDto> {
    const [row] = await this.db
      .update(schema.ltiPlatforms)
      .set({ is_active: isActive })
      .where(
        and(
          eq(schema.ltiPlatforms.id, id),
          eq(schema.ltiPlatforms.tenant_id, tenantId)
        )
      )
      .returning();
    if (!row) throw new NotFoundException('LTI platform ' + id + ' not found');
    return this.rowToDto(row);
  }

  async initiateLogin(params: LtiLaunchParams): Promise<LtiLoginRedirect> {
    const conditions = [
      eq(schema.ltiPlatforms.platform_url, params.iss),
      eq(schema.ltiPlatforms.is_active, true),
    ];
    if (params.client_id) {
      conditions.push(eq(schema.ltiPlatforms.client_id, params.client_id));
    }

    const [platform] = await this.db
      .select()
      .from(schema.ltiPlatforms)
      .where(and(...conditions))
      .limit(1);

    if (!platform) {
      throw new NotFoundException(
        'LTI platform not found for iss=' + params.iss
      );
    }

    const nonce = randomUUID();
    const state = randomUUID();
    this.storeNonce(nonce, state);

    const callbackUrl =
      (process.env.GATEWAY_URL ?? 'http://localhost:4000') + '/lti/callback';

    const query = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      client_id: platform.client_id,
      redirect_uri: callbackUrl,
      login_hint: params.login_hint,
      nonce,
      state,
=======
import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import * as crypto from 'crypto';
import type {
  LtiClaims,
  LtiLoginRequest,
  LtiPlatformConfig,
  LtiStatePayload,
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
  async storeState(state: string, nonce: string, loginHint: string): Promise<void> {
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

  buildAuthUrl(
    body: LtiLoginRequest,
    state: string,
    nonce: string,
  ): string {
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
>>>>>>> ed645f7 (feat(lti): implement LTI 1.3 login initiation + launch validation + deep linking)
      response_mode: 'form_post',
      prompt: 'none',
    });

<<<<<<< HEAD
    if (params.lti_message_hint) {
      query.set('lti_message_hint', params.lti_message_hint);
    }

    const redirectUrl = platform.auth_login_url + '?' + query.toString();
    this.logger.debug(
      'LTI login initiated iss=' + params.iss + ' nonce=' + nonce
    );
    return { redirectUrl, state, nonce };
  }

  async handleCallback(
    idToken: string,
    state: string
  ): Promise<LtiCallbackResult> {
    let unverifiedPayload: LtiIdToken;
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      const payloadJson = Buffer.from(parts[1] ?? '', 'base64url').toString(
        'utf-8'
      );
      unverifiedPayload = JSON.parse(payloadJson) as LtiIdToken;
    } catch (e) {
      throw new BadRequestException('Invalid id_token: ' + String(e));
    }

    const [platform] = await this.db
      .select()
      .from(schema.ltiPlatforms)
      .where(eq(schema.ltiPlatforms.platform_url, unverifiedPayload.iss))
      .limit(1);

    if (!platform) {
      throw new NotFoundException(
        'No LTI platform for iss=' + unverifiedPayload.iss
      );
    }

    let verified: LtiIdToken;
    try {
      const jwks = createRemoteJWKSet(new URL(platform.key_set_url));
      const { payload } = await jwtVerify<LtiIdToken>(idToken, jwks, {
        issuer: platform.platform_url,
        audience: platform.client_id,
      });
      verified = payload;
    } catch (e) {
      throw new UnauthorizedException(
        'LTI token verification failed: ' + String(e)
      );
    }

    if (!this.consumeNonce(verified.nonce, state)) {
      throw new UnauthorizedException(
        'LTI nonce invalid, expired, or already used'
      );
    }

    const courseId =
      verified['https://purl.imsglobal.org/spec/lti/claim/context']?.id;

    const [launch] = await this.db
      .insert(schema.ltiLaunches)
      .values({
        tenant_id: platform.tenant_id,
        platform_id: platform.id,
        user_id: verified.sub,
        course_id: courseId ?? null,
        launch_nonce: verified.nonce,
        launch_data: verified as unknown as Record<string, unknown>,
      })
      .returning();

    if (!launch) throw new Error('Failed to record LTI launch');

    const sessionToken = Buffer.from(
      JSON.stringify({ sub: verified.sub, iss: verified.iss, iat: Date.now() })
    ).toString('base64url');

    this.logger.log(
      'LTI callback success launchId=' + launch.id + ' sub=' + verified.sub
    );
    return {
      sessionToken,
      userId: verified.sub,
      courseId,
      launchId: launch.id,
    };
  }

  private inputToRow(input: RegisterLtiPlatformInput) {
    return {
      platform_name: input.platformName,
      platform_url: input.platformUrl,
      client_id: input.clientId,
      auth_login_url: input.authLoginUrl,
      auth_token_url: input.authTokenUrl,
      key_set_url: input.keySetUrl,
      deployment_id: input.deploymentId,
    };
  }

  private rowToDto(
    row: typeof schema.ltiPlatforms.$inferSelect
  ): LtiPlatformDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      platformName: row.platform_name,
      platformUrl: row.platform_url,
      clientId: row.client_id,
      authLoginUrl: row.auth_login_url,
      authTokenUrl: row.auth_token_url,
      keySetUrl: row.key_set_url,
      deploymentId: row.deployment_id,
      isActive: row.is_active,
    };
  }

  getNonceMapSize(): number {
    return this.nonceMap.size;
=======
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
      throw new UnauthorizedException('LTI state missing, expired, or already used');
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
      throw new UnauthorizedException(`LTI id_token verification failed: ${msg}`);
    }

    // Verify nonce (one-time use — prevents replay attacks)
    if (claims.nonce !== storedState.nonce) {
      throw new UnauthorizedException('LTI nonce mismatch');
    }

    // Verify LTI version
    const ltiVersion = claims['https://purl.imsglobal.org/spec/lti/claim/version'];
    if (ltiVersion !== '1.3.0') {
      throw new BadRequestException(`Unsupported LTI version: ${ltiVersion}`);
    }

    this.logger.log({ sub: claims.sub, iss: claims.iss }, 'LTI launch validated');
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
    const resourceLink = claims['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    const context = claims['https://purl.imsglobal.org/spec/lti/claim/context'];
    const targetLinkUri = claims['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'];

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
      this.logger.warn('LTI_TOOL_PRIVATE_KEY not configured — returning empty JWKS');
      return { keys: [] };
    }
    try {
      const keyObject = crypto.createPrivateKey(privateKeyPem);
      const publicKey = crypto.createPublicKey(keyObject);
      const jwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
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
>>>>>>> ed645f7 (feat(lti): implement LTI 1.3 login initiation + launch validation + deep linking)
  }
}
