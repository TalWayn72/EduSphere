/**
 * Content item fetching — Drizzle ORM query with RLS enforcement.
 *
 * Fetches a single content item by UUID within the caller's tenant.
 * Returns null when the item does not exist or is not accessible.
 *
 * Tenant isolation: content_items has no tenant_id column; isolation is
 * enforced through the RLS policy chain:
 *   content_items → modules.course_id → courses.tenant_id
 * The withTenantContext wrapper sets app.current_tenant so the policy fires.
 */

import { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createDatabaseConnection, schema, withTenantContext } from '@edusphere/db';
import type { ContentItemResult } from './tools/agent-tools';

const logger = new Logger('ContentDb');

export async function fetchContentItem(
  contentItemId: string,
  tenantId: string,
): Promise<ContentItemResult | null> {
  logger.debug(`fetchContentItem: id=${contentItemId} tenant=${tenantId}`);

  const db = createDatabaseConnection();

  try {
    const result = await withTenantContext(
      db,
      { tenantId, userId: 'system', userRole: 'STUDENT' },
      async (tx) => {
        const [item] = await tx
          .select({
            id: schema.contentItems.id,
            title: schema.contentItems.title,
            type: schema.contentItems.type,
            content: schema.contentItems.content,
          })
          .from(schema.contentItems)
          .where(eq(schema.contentItems.id, contentItemId))
          .limit(1);

        return item ?? null;
      },
    );

    if (!result) return null;

    return {
      id: result.id,
      title: result.title,
      type: result.type,
      content: result.content ? result.content.slice(0, 500) : null,
    };
  } catch (err) {
    logger.error(`fetchContentItem failed: ${String(err)}`);
    return null;
  }
}
