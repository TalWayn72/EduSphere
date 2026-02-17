import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { courses, NewCourse } from '@edusphere/db';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class CourseService {
  async findById(id: string) {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async findAll(limit: number = 20, offset: number = 0) {
    return db
      .select()
      .from(courses)
      .orderBy(desc(courses.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findByInstructor(instructorId: string, limit: number = 20) {
    return db
      .select()
      .from(courses)
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(courses.createdAt))
      .limit(limit);
  }

  async create(input: Partial<NewCourse>) {
    const tenantId = process.env.TENANT_ID || 'default-tenant-uuid';

    const [course] = await db
      .insert(courses)
      .values({
        ...input,
        tenantId,
      } as NewCourse)
      .returning();

    return course;
  }

  async update(id: string, input: Partial<NewCourse>) {
    const [updated] = await db
      .update(courses)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(courses).where(eq(courses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async publish(id: string) {
    return this.update(id, { isPublished: true });
  }

  async unpublish(id: string) {
    return this.update(id, { isPublished: false });
  }
}
