/**
 * OrgDomainService — Queries organization domains for a tenant.
 * Uses withTenantContext for RLS compliance (SI-9).
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';

export interface OrganizationDomain {
  id: string;
  domain: string;
  verified: boolean;
  createdAt: Date;
}

@Injectable()
export class OrgDomainService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgDomainService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[OrgDomainService] onModuleDestroy: cleaned up');
  }

  /**
   * List all domains for an organization (tenant).
   * Returns domains from the tenant_domains table filtered by orgId.
   */
  async findByOrgId(
    orgId: string,
    tenantCtx: TenantContext
  ): Promise<OrganizationDomain[]> {
    this.logger.debug(
      { orgId, tenantId: tenantCtx.tenantId },
      '[OrgDomainService] findByOrgId'
    );

    const rows = await withTenantContext(
      this.db,
      tenantCtx,
      async (db) => {
        return db
          .select({
            id: schema.tenantDomains.id,
            domain: schema.tenantDomains.domain,
            verified: schema.tenantDomains.verified,
            createdAt: schema.tenantDomains.createdAt,
          })
          .from(schema.tenantDomains)
          .where(eq(schema.tenantDomains.tenantId, orgId));
      }
    );

    return rows;
  }
}
