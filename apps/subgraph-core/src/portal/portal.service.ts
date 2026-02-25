/**
 * PortalService — F-037 No-Code Custom Portal Builder
 * Manages portal page CRUD: create, update, publish, block management.
 * Memory safety: OnModuleDestroy calls closeAllPools().
 */
import { Injectable, Logger, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
  eq,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { PortalPage, PortalBlock } from '@edusphere/db';
import { ALLOWED_BLOCK_TYPES } from '@edusphere/db';

const ADMIN_ROLE = 'ORG_ADMIN' as const;

@Injectable()
export class PortalService implements OnModuleDestroy {
  private readonly logger = new Logger(PortalService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('PortalService destroyed — DB pools closed');
  }

  async getPortalPage(tenantId: string): Promise<PortalPage | null> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: ADMIN_ROLE };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.portalPages).where(eq(schema.portalPages.tenantId, tenantId)).limit(1),
    );
    return rows[0] ?? null;
  }

  async getPublishedPortalPage(tenantId: string): Promise<PortalPage | null> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: STUDENT_ROLE };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.portalPages).where(eq(schema.portalPages.tenantId, tenantId)).limit(1),
    );
    const page = rows[0] ?? null;
    return page?.published ? page : null;
  }

  async createOrUpdatePortal(
    tenantId: string,
    layout: PortalBlock[],
    title: string,
    createdBy: string,
  ): Promise<PortalPage> {
    layout.forEach((b) => this.validateBlock(b));
    const ctx: TenantContext = { tenantId, userId: createdBy, userRole: ADMIN_ROLE };
    const existing = await this.getPortalPage(tenantId);

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      if (existing) {
        return tx
          .update(schema.portalPages)
          .set({ layout, title, updatedAt: new Date() })
          .where(eq(schema.portalPages.tenantId, tenantId))
          .returning();
      }
      return tx
        .insert(schema.portalPages)
        .values({ tenantId, layout, title, createdBy, slug: 'home' })
        .returning();
    });

    const page = rows[0];
    if (!page) throw new BadRequestException('Failed to save portal layout');
    this.logger.log({ tenantId, title }, 'Portal layout saved');
    return page;
  }

  async publishPortal(tenantId: string): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: ADMIN_ROLE };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.portalPages)
        .set({ published: true, updatedAt: new Date() })
        .where(eq(schema.portalPages.tenantId, tenantId)),
    );
    this.logger.log({ tenantId }, 'Portal published');
  }

  async unpublishPortal(tenantId: string): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: ADMIN_ROLE };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.portalPages)
        .set({ published: false, updatedAt: new Date() })
        .where(eq(schema.portalPages.tenantId, tenantId)),
    );
    this.logger.log({ tenantId }, 'Portal unpublished');
  }

  async addBlock(tenantId: string, block: PortalBlock, createdBy: string): Promise<PortalPage> {
    this.validateBlock(block);
    const existing = await this.getPortalPage(tenantId);
    const currentBlocks = (existing?.layout ?? []) as PortalBlock[];
    const newLayout = [...currentBlocks, { ...block, order: currentBlocks.length }];
    return this.createOrUpdatePortal(tenantId, newLayout, existing?.title ?? 'Learning Portal', createdBy);
  }

  async removeBlock(tenantId: string, blockId: string, userId: string): Promise<PortalPage> {
    const existing = await this.getPortalPage(tenantId);
    const currentBlocks = (existing?.layout ?? []) as PortalBlock[];
    const filtered = currentBlocks
      .filter((b) => b.id !== blockId)
      .map((b, i) => ({ ...b, order: i }));
    return this.createOrUpdatePortal(tenantId, filtered, existing?.title ?? 'Learning Portal', userId);
  }

  async reorderBlocks(tenantId: string, blockIds: string[], userId: string): Promise<PortalPage> {
    const existing = await this.getPortalPage(tenantId);
    const currentBlocks = (existing?.layout ?? []) as PortalBlock[];
    const blockMap = new Map(currentBlocks.map((b) => [b.id, b]));
    const reordered = blockIds.map((id, order) => {
      const b = blockMap.get(id);
      if (!b) throw new BadRequestException(`Block not found: ${id}`);
      return { ...b, order };
    });
    return this.createOrUpdatePortal(tenantId, reordered, existing?.title ?? 'Learning Portal', userId);
  }

  validateBlock(block: PortalBlock): void {
    if (!(ALLOWED_BLOCK_TYPES as readonly string[]).includes(block.type)) {
      throw new BadRequestException(
        `Invalid block type: ${block.type}. Allowed: ${ALLOWED_BLOCK_TYPES.join(', ')}`,
      );
    }
  }
}

const STUDENT_ROLE = 'STUDENT' as const;
