import { Injectable, Logger } from '@nestjs/common';
import { db } from '@edusphere/db';
import { tenantBranding } from '@edusphere/db/schema';
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

@Injectable()
export class TenantBrandingService {
  private readonly logger = new Logger(TenantBrandingService.name);
  // Simple in-memory TTL cache — key=tenantId, value={data, expiresAt}
  private readonly cache = new Map<string, { data: TenantBrandingData; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

    this.cache.set(tenantId, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return data;
  }

  async updateBranding(
    tenantId: string,
    input: Partial<Omit<TenantBrandingData, 'organizationName'>> & { organizationName?: string },
  ): Promise<TenantBrandingData> {
    await db
      .insert(tenantBranding)
      .values({ tenantId, organizationName: input.organizationName ?? 'My Organization', ...input })
      .onConflictDoUpdate({
        target: tenantBranding.tenantId,
        set: { ...input, updatedAt: new Date() },
      });

    this.cache.delete(tenantId); // Invalidate cache
    this.logger.log({ tenantId }, 'Tenant branding updated');
    return this.getBranding(tenantId);
  }
}
