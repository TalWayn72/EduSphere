/**
 * LtiPlatformService — DB-backed LTI platform management (F-015).
 * Replaces env-only stubs with Drizzle queries against lti_platforms table.
 * Falls back to env config when no DB records exist (backward compatibility).
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { z } from 'zod';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
  eq,
  and,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { LtiPlatformDto, RegisterLtiPlatformInput } from './lti.types';

const registerPlatformSchema = z.object({
  platformName: z.string().min(1).max(255),
  platformUrl: z.string().url(),
  clientId: z.string().min(1).max(255),
  authLoginUrl: z.string().url(),
  authTokenUrl: z.string().url(),
  keySetUrl: z.string().url(),
  deploymentId: z.string().min(1).max(255),
});

function rowToDto(
  row: typeof schema.ltiPlatforms.$inferSelect,
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

@Injectable()
export class LtiPlatformService implements OnModuleDestroy {
  private readonly logger = new Logger(LtiPlatformService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** List platforms from DB; fall back to env config if none exist. */
  async getPlatforms(tenantId: string): Promise<LtiPlatformDto[]> {
    const ctx = this.buildCtx(tenantId);
    const rows = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.ltiPlatforms)
        .where(eq(schema.ltiPlatforms.tenant_id, tenantId)),
    );

    if (rows.length > 0) return rows.map(rowToDto);

    // Fallback: env-based single platform (backward compatibility)
    return this.getEnvFallback(tenantId);
  }

  /** Register a new LTI platform in the database. */
  async registerPlatform(
    tenantId: string,
    input: RegisterLtiPlatformInput,
  ): Promise<LtiPlatformDto> {
    const parsed = registerPlatformSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const ctx = this.buildCtx(tenantId);
    const [row] = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .insert(schema.ltiPlatforms)
        .values({
          tenant_id: tenantId,
          platform_name: input.platformName,
          platform_url: input.platformUrl,
          client_id: input.clientId,
          auth_login_url: input.authLoginUrl,
          auth_token_url: input.authTokenUrl,
          key_set_url: input.keySetUrl,
          deployment_id: input.deploymentId,
          is_active: true,
        })
        .returning(),
    );

    if (!row) throw new BadRequestException('Failed to register platform');
    this.logger.log({ tenantId, platformId: row.id }, 'LTI platform registered');
    return rowToDto(row);
  }

  /** Toggle a platform's active state. */
  async togglePlatform(
    id: string,
    tenantId: string,
    isActive: boolean,
  ): Promise<LtiPlatformDto> {
    const ctx = this.buildCtx(tenantId);
    const [updated] = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.ltiPlatforms)
        .set({ is_active: isActive })
        .where(
          and(
            eq(schema.ltiPlatforms.id, id),
            eq(schema.ltiPlatforms.tenant_id, tenantId),
          ),
        )
        .returning(),
    );

    if (!updated) {
      throw new NotFoundException(`LTI platform ${id} not found for tenant`);
    }
    this.logger.log({ tenantId, platformId: id, isActive }, 'LTI platform toggled');
    return rowToDto(updated);
  }

  private buildCtx(tenantId: string): TenantContext {
    return { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
  }

  private getEnvFallback(tenantId: string): LtiPlatformDto[] {
    const issuer = process.env['LTI_PLATFORM_ISSUER'] ?? '';
    if (!issuer) return [];
    return [
      {
        id: `env-${tenantId}`,
        tenantId,
        platformName: 'LMS Platform',
        platformUrl: issuer,
        clientId: process.env['LTI_PLATFORM_CLIENT_ID'] ?? '',
        authLoginUrl: process.env['LTI_PLATFORM_AUTH_ENDPOINT'] ?? '',
        authTokenUrl: process.env['LTI_PLATFORM_AUTH_ENDPOINT'] ?? '',
        keySetUrl: process.env['LTI_PLATFORM_JWKS_URL'] ?? '',
        deploymentId: process.env['LTI_DEPLOYMENT_ID'] ?? '',
        isActive: true,
      },
    ];
  }
}
