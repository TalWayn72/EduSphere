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
      response_mode: 'form_post',
      prompt: 'none',
    });

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
  }
}
