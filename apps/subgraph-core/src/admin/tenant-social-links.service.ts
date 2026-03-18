/**
 * TenantSocialLinksService — Phase 65.
 * CRUD for tenant social media link configuration.
 * RLS enforced via withTenantContext().
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

interface SocialLinksDto {
  id: string;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  githubUrl: string | null;
}

interface UpdateInput {
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  whatsappUrl?: string | null;
  githubUrl?: string | null;
}

@Injectable()
export class TenantSocialLinksService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantSocialLinksService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** Get social links for the current tenant. */
  async get(tenantId: string, userId: string): Promise<SocialLinksDto | null> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.tenantSocialLinks)
        .where(eq(schema.tenantSocialLinks.tenantId, tenantId))
        .limit(1);
    });

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  /** Upsert social links for a tenant (admin only). */
  async upsert(
    tenantId: string,
    userId: string,
    input: UpdateInput
  ): Promise<SocialLinksDto> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };

    const [row] = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .insert(schema.tenantSocialLinks)
        .values({
          tenantId,
          linkedinUrl: input.linkedinUrl ?? null,
          facebookUrl: input.facebookUrl ?? null,
          twitterUrl: input.twitterUrl ?? null,
          youtubeUrl: input.youtubeUrl ?? null,
          instagramUrl: input.instagramUrl ?? null,
          whatsappUrl: input.whatsappUrl ?? null,
          githubUrl: input.githubUrl ?? null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.tenantSocialLinks.tenantId],
          set: {
            linkedinUrl: input.linkedinUrl ?? null,
            facebookUrl: input.facebookUrl ?? null,
            twitterUrl: input.twitterUrl ?? null,
            youtubeUrl: input.youtubeUrl ?? null,
            instagramUrl: input.instagramUrl ?? null,
            whatsappUrl: input.whatsappUrl ?? null,
            githubUrl: input.githubUrl ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();
    });

    this.logger.log(`[TenantSocialLinksService] Upserted social links — tenantId=${tenantId}`);
    return this.mapRow(row);
  }

  private mapRow(r: typeof schema.tenantSocialLinks.$inferSelect): SocialLinksDto {
    return {
      id: r.id,
      linkedinUrl: r.linkedinUrl,
      facebookUrl: r.facebookUrl,
      twitterUrl: r.twitterUrl,
      youtubeUrl: r.youtubeUrl,
      instagramUrl: r.instagramUrl,
      whatsappUrl: r.whatsappUrl,
      githubUrl: r.githubUrl,
    };
  }
}
