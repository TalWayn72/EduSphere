import { Injectable } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, desc } from '@edusphere/db';

@Injectable()
export class CourseService {
  private db = createDatabaseConnection();

  private mapCourse(course: any) {
    if (!course) return null;
    return {
      ...course,
      tenantId: course.tenant_id || course.tenantId || '',
      instructorId: course.instructor_id || course.creator_id || course.instructorId || '',
      isPublished: course.is_published !== undefined ? course.is_published : (course.isPublished || course.is_public || false),
      slug: course.slug || '',
      thumbnailUrl: course.thumbnail_url || course.thumbnailUrl || null,
      estimatedHours: course.estimated_hours !== undefined ? course.estimated_hours : (course.estimatedHours || null),
    };
  }

  async findById(id: string) {
    const [course] = await this.db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, id))
      .limit(1);
    return this.mapCourse(course) || null;
  }

  async findAll(limit: number, offset: number) {
    const rows = await this.db
      .select()
      .from(schema.courses)
      .orderBy(desc(schema.courses.created_at))
      .limit(limit)
      .offset(offset);
    return rows.map((c) => this.mapCourse(c));
  }

  async create(input: any) {
    const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const [course] = await this.db
      .insert(schema.courses)
      .values({
        tenant_id: input.tenantId,
        title: input.title,
        slug,
        description: input.description,
        creator_id: input.instructorId || input.creatorId,
        instructor_id: input.instructorId || input.creatorId,
        is_published: input.isPublished || false,
        thumbnail_url: input.thumbnailUrl,
        estimated_hours: input.estimatedHours,
      })
      .returning();
    return this.mapCourse(course);
  }

  async update(id: string, input: any) {
    const updateData: any = { updated_at: new Date() };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.thumbnailUrl !== undefined) updateData.thumbnail_url = input.thumbnailUrl;
    if (input.estimatedHours !== undefined) updateData.estimated_hours = input.estimatedHours;

    const [course] = await this.db
      .update(schema.courses)
      .set(updateData)
      .where(eq(schema.courses.id, id))
      .returning();
    return this.mapCourse(course);
  }
}
