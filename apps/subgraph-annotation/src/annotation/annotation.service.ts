import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { annotations, NewAnnotation } from '@edusphere/db';
import { eq, and, desc, sql } from 'drizzle-orm';

@Injectable()
export class AnnotationService {
  async findById(id: string) {
    const [annotation] = await db
      .select()
      .from(annotations)
      .where(eq(annotations.id, id))
      .limit(1);

    if (!annotation) {
      throw new NotFoundException(`Annotation with ID ${id} not found`);
    }

    return annotation;
  }

  async findByContentItem(contentItemId: string) {
    return db
      .select()
      .from(annotations)
      .where(eq(annotations.contentItemId, contentItemId))
      .orderBy(desc(annotations.createdAt));
  }

  async findByUser(userId: string) {
    return db
      .select()
      .from(annotations)
      .where(eq(annotations.userId, userId))
      .orderBy(desc(annotations.createdAt));
  }

  async findByType(contentItemId: string, type: string) {
    return db
      .select()
      .from(annotations)
      .where(and(eq(annotations.contentItemId, contentItemId), sql`${annotations.type} = ${type}`))
      .orderBy(desc(annotations.createdAt));
  }

  async create(input: Partial<NewAnnotation>) {
    const [annotation] = await db
      .insert(annotations)
      .values(input as NewAnnotation)
      .returning();

    return annotation;
  }

  async update(id: string, input: Partial<NewAnnotation>) {
    const [updated] = await db
      .update(annotations)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(annotations.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Annotation with ID ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(annotations).where(eq(annotations.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
