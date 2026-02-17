import { Injectable } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, desc } from '@edusphere/db';

@Injectable()
export class CourseService {
  private db = createDatabaseConnection();

  async findById(id: string) {
    const [course] = await this.db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, id))
      .limit(1);
    return course || null;
  }

  async findAll(limit: number, offset: number) {
    return this.db
      .select()
      .from(schema.courses)
      .orderBy(desc(schema.courses.created_at))
      .limit(limit)
      .offset(offset);
  }

  async create(input: any) {
    const [course] = await this.db
      .insert(schema.courses)
      .values({
        tenant_id: input.tenantId,
        title: input.title,
        description: input.description,
        creator_id: input.creatorId,
      })
      .returning();
    return course;
  }

  async update(id: string, input: any) {
    const [course] = await this.db
      .update(schema.courses)
      .set({
        title: input.title,
        description: input.description,
        updated_at: new Date(),
      })
      .where(eq(schema.courses.id, id))
      .returning();
    return course;
  }
}
