import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { contentItems, NewContentItem } from '@edusphere/db';
import { eq, and, asc, inArray, sql } from 'drizzle-orm';

@Injectable()
export class ContentItemService {
  async findById(id: string) {
    const [item] = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, id))
      .limit(1);

    if (!item) {
      throw new NotFoundException(`ContentItem with ID ${id} not found`);
    }

    return item;
  }

  async findByModule(moduleId: string) {
    return db
      .select()
      .from(contentItems)
      .where(eq(contentItems.moduleId, moduleId))
      .orderBy(asc(contentItems.orderIndex));
  }

  async findByType(moduleId: string, type: string) {
    return db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.moduleId, moduleId), sql`${contentItems.type} = ${type}`))
      .orderBy(asc(contentItems.orderIndex));
  }

  async create(input: Partial<NewContentItem>) {
    const [item] = await db
      .insert(contentItems)
      .values(input as NewContentItem)
      .returning();

    return item;
  }

  async update(id: string, input: Partial<NewContentItem>) {
    const [updated] = await db
      .update(contentItems)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`ContentItem with ID ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(contentItems).where(eq(contentItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorder(moduleId: string, itemIds: string[]) {
    // Update order_index for all items
    const updates = itemIds.map((id, index) =>
      db
        .update(contentItems)
        .set({ orderIndex: index })
        .where(eq(contentItems.id, id)),
    );

    await Promise.all(updates);

    // Return reordered items
    return db
      .select()
      .from(contentItems)
      .where(inArray(contentItems.id, itemIds))
      .orderBy(asc(contentItems.orderIndex));
  }
}
