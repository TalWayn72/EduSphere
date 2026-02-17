import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { discussions, NewDiscussion } from '@edusphere/db';
import { eq, desc, isNull, sql } from 'drizzle-orm';

@Injectable()
export class DiscussionService {
  async findById(id: string) {
    const [discussion] = await db
      .select()
      .from(discussions)
      .where(eq(discussions.id, id))
      .limit(1);

    if (!discussion) {
      throw new NotFoundException(`Discussion with ID ${id} not found`);
    }

    return discussion;
  }

  async findByContentItem(contentItemId: string) {
    return db
      .select()
      .from(discussions)
      .where(eq(discussions.contentItemId, contentItemId))
      .orderBy(desc(discussions.createdAt));
  }

  async findByAuthor(authorId: string) {
    return db
      .select()
      .from(discussions)
      .where(eq(discussions.authorId, authorId))
      .orderBy(desc(discussions.createdAt));
  }

  async findReplies(parentId: string) {
    return db
      .select()
      .from(discussions)
      .where(eq(discussions.parentId, parentId))
      .orderBy(desc(discussions.createdAt));
  }

  async create(input: Partial<NewDiscussion>) {
    const result = await db
      .insert(discussions)
      .values(input as NewDiscussion)
      .returning() as any;

    return result[0];
  }

  async update(id: string, input: Partial<NewDiscussion>) {
    const result = await db
      .update(discussions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(discussions.id, id))
      .returning() as any;

    if (!result[0]) {
      throw new NotFoundException(`Discussion with ID ${id} not found`);
    }

    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(discussions).where(eq(discussions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async upvote(id: string) {
    const result = await db
      .update(discussions)
      .set({
        upvotes: sql`${discussions.upvotes} + 1`,
      })
      .where(eq(discussions.id, id))
      .returning() as any;

    if (!result[0]) {
      throw new NotFoundException(`Discussion with ID ${id} not found`);
    }

    return result[0];
  }

  async reply(parentId: string, input: any) {
    return this.create({
      ...input,
      parentId,
    });
  }
}
