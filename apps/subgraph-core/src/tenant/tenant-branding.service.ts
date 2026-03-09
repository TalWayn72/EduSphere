import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, tenantBranding, tenants, closeAllPools } from '@edusphere/db';
import { eq } from 'drizzle-orm';

export interface TenantBrandingData {
  logoUrl: string;
  logoMarkUrl?: string | null;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  organizationName: string;
  tagline?: string | null;
  privacyPolicyUrl?: string | null;
  termsOfServiceUrl?: string | null;
  supportEmail?: string | null;
  hideEduSphereBranding: boolean;
}

const DEFAULT_BRANDING: TenantBrandingData = {
  logoUrl: '/defaults/logo.svg',
  faviconUrl: '/defaults/favicon.ico',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  organizationName: 'EduSphere',
  hideEduSphereBranding: false,
};

export const BRANDING_CACHE_MAX_SIZE = 500;

@Injectable()
export class TenantBrandingService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantBrandingService.name);
  // Simple in-memory TTL cache — key=tenantId, value={data, expiresAt}
  private readonly cache = new Map<
    string,
    { data: TenantBrandingData; expiresAt: number }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  async onModuleDestroy(): Promise<void> {
    this.cache.clear();
    await closeAllPools();
    this.logger.log('[TenantBrandingService] onModuleDestroy: cache cleared, DB pools closed');
  }

  private setCached(
    key: string,
    value: { data: TenantBrandingData; expiresAt: number }
  ): void {
    // LRU eviction: if at max, remove oldest (first) key before inserting new one
    if (this.cache.size >= BRANDING_CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  async getBranding(tenantId: string): Promise<TenantBrandingData> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const rows = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    const data: TenantBrandingData = rows[0]
      ? {
          logoUrl: rows[0].logoUrl,
          logoMarkUrl: rows[0].logoMarkUrl,
          faviconUrl: rows[0].faviconUrl,
          primaryColor: rows[0].primaryColor,
          secondaryColor: rows[0].secondaryColor,
          accentColor: rows[0].accentColor,
          backgroundColor: rows[0].backgroundColor,
          fontFamily: rows[0].fontFamily,
          organizationName: rows[0].organizationName,
          tagline: rows[0].tagline,
          privacyPolicyUrl: rows[0].privacyPolicyUrl,
          termsOfServiceUrl: rows[0].termsOfServiceUrl,
          supportEmail: rows[0].supportEmail,
          hideEduSphereBranding: rows[0].hideEduSphereBranding,
        }
      : { ...DEFAULT_BRANDING };

    this.setCached(tenantId, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
    return data;
  }

  async getPublicBranding(slug: string): Promise<{
    primaryColor: string;
    accentColor: string;
    logoUrl: string;
    faviconUrl: string;
    organizationName: string;
    tagline: string | null;
  } | null> {
    try {
      const rows = await db
        .select({
          primaryColor: tenantBranding.primaryColor,
          accentColor: tenantBranding.accentColor,
          logoUrl: tenantBranding.logoUrl,
          faviconUrl: tenantBranding.faviconUrl,
          organizationName: tenantBranding.organizationName,
          tagline: tenantBranding.tagline,
        })
        .from(tenantBranding)
        .innerJoin(tenants, eq(tenants.id, tenantBranding.tenantId))
        .where(eq(tenants.slug, slug))
        .limit(1);
      return rows[0] ?? null;
    } catch (err) {
      this.logger.warn({ slug, err }, '[TenantBrandingService] getPublicBranding failed');
      return null;
    }
  }

  async updateBranding(
    tenantId: string,
    input: Partial<Omit<TenantBrandingData, 'organizationName'>> & {
      organizationName?: string;
    }
  ): Promise<TenantBrandingData> {
    await db
      .insert(tenantBranding)
      .values({
        tenantId,
        organizationName: input.organizationName ?? 'My Organization',
        ...input,
      })
      .onConflictDoUpdate({
        target: tenantBranding.tenantId,
        set: { ...input, updatedAt: new Date() },
      });

    this.cache.delete(tenantId); // Invalidate cache
    this.logger.log({ tenantId }, 'Tenant branding updated');
    return this.getBranding(tenantId);
  }
}
