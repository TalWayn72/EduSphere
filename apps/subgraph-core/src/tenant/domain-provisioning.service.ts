/**
 * DomainProvisioningService — Manages subdomain creation and custom domain
 * verification for white-label tenants.
 *
 * Uses DnsProvider interface (Cloudflare in prod, Mock in dev/test).
 * All DB queries wrapped in withTenantContext for RLS compliance (SI-9).
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';
import type { DnsProvider } from '@edusphere/dns-provider';
import { MockDnsProvider } from '@edusphere/dns-provider';

// eslint-disable-next-line security/detect-unsafe-regex -- RFC 1035 domain label pattern, bounded quantifiers
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

@Injectable()
export class DomainProvisioningService implements OnModuleDestroy {
  private readonly logger = new Logger(DomainProvisioningService.name);
  private readonly db: Database;
  private readonly dnsProvider: DnsProvider;

  constructor() {
    this.db = createDatabaseConnection();
    // In production, inject CloudflareDnsProvider via DI or env-based factory
    this.dnsProvider = new MockDnsProvider();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[DomainProvisioningService] onModuleDestroy: cleaned up');
  }

  /**
   * Create a subdomain for a tenant during provisioning.
   * Called by OrgProvisioningService saga step 5b.
   */
  async createSubdomain(
    slug: string,
    tenantCtx: TenantContext
  ): Promise<{ url: string }> {
    this.logger.log(
      { tenantId: tenantCtx.tenantId, slug },
      '[DomainProvisioningService] Creating subdomain'
    );

    const result = await this.dnsProvider.createSubdomain(slug);

    // Store subdomain in tenant_domains table
    await withTenantContext(this.db, tenantCtx, async (db) => {
      await db.insert(schema.tenantDomains).values({
        tenantId: tenantCtx.tenantId,
        domain: `${slug}.edusphere.io`,
        domainType: 'SUBDOMAIN',
        verified: true,
        sslProvisioned: true,
      });
    });

    return result;
  }

  /**
   * Request custom domain verification — returns DNS instructions.
   */
  async requestCustomDomain(
    domain: string,
    tenantCtx: TenantContext
  ): Promise<{
    token: string;
    recordType: string;
    recordValue: string;
    instructions: string;
  }> {
    // Validate domain format
    const normalized = domain.toLowerCase().trim();
    if (!DOMAIN_REGEX.test(normalized)) {
      throw new BadRequestException('Invalid domain format');
    }

    this.logger.log(
      { tenantId: tenantCtx.tenantId, domain: normalized },
      '[DomainProvisioningService] Requesting custom domain verification'
    );

    const verification =
      await this.dnsProvider.requestDomainVerification(normalized);

    // Store in custom_domains table
    await withTenantContext(this.db, tenantCtx, async (db) => {
      await db.insert(schema.customDomains).values({
        tenantId: tenantCtx.tenantId,
        domain: normalized,
        verificationToken: verification.token,
        verificationRecordType: verification.recordType,
        sslStatus: 'pending',
      });
    });

    return {
      token: verification.token,
      recordType: verification.recordType,
      recordValue: verification.recordValue,
      instructions: `Add a ${verification.recordType} record for ${verification.recordValue} with value "${verification.token}"`,
    };
  }

  /**
   * Check if custom domain DNS verification is complete.
   */
  async checkCustomDomain(
    domain: string,
    tenantCtx: TenantContext
  ): Promise<{
    id: string;
    domain: string;
    verificationToken: string | null;
    verificationRecordType: string | null;
    verifiedAt: Date | null;
    sslStatus: string;
    createdAt: Date;
  }> {
    const normalized = domain.toLowerCase().trim();

    const rows = await withTenantContext(this.db, tenantCtx, async (db) => {
      return db
        .select()
        .from(schema.customDomains)
        .where(
          and(
            eq(schema.customDomains.domain, normalized),
            eq(schema.customDomains.tenantId, tenantCtx.tenantId)
          )
        )
        .limit(1);
    });

    const record = rows[0];
    if (!record) {
      throw new NotFoundException('Custom domain not found');
    }

    if (record.verifiedAt) {
      return record;
    }

    // Check DNS verification
    const verified = await this.dnsProvider.checkDomainVerification(
      normalized,
      record.verificationToken ?? ''
    );

    if (verified) {
      const now = new Date();
      await withTenantContext(this.db, tenantCtx, async (db) => {
        await db
          .update(schema.customDomains)
          .set({ verifiedAt: now, sslStatus: 'provisioning' })
          .where(eq(schema.customDomains.id, record.id));
      });

      this.logger.log(
        { tenantId: tenantCtx.tenantId, domain: normalized },
        '[DomainProvisioningService] Domain verified, SSL provisioning started'
      );

      return { ...record, verifiedAt: now, sslStatus: 'provisioning' };
    }

    return record;
  }

  /**
   * Remove a custom domain record.
   */
  async removeCustomDomain(
    domainId: string,
    tenantCtx: TenantContext
  ): Promise<boolean> {
    const deleted = await withTenantContext(this.db, tenantCtx, async (db) => {
      const result = await db
        .delete(schema.customDomains)
        .where(
          and(
            eq(schema.customDomains.id, domainId),
            eq(schema.customDomains.tenantId, tenantCtx.tenantId)
          )
        )
        .returning({ id: schema.customDomains.id });
      return result.length > 0;
    });

    return deleted;
  }

  /**
   * List all custom domains for a tenant.
   */
  async listCustomDomains(tenantCtx: TenantContext): Promise<
    Array<{
      id: string;
      domain: string;
      verificationToken: string | null;
      verificationRecordType: string | null;
      verifiedAt: Date | null;
      sslStatus: string;
      createdAt: Date;
    }>
  > {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      return db
        .select()
        .from(schema.customDomains)
        .where(eq(schema.customDomains.tenantId, tenantCtx.tenantId));
    });
  }
}
