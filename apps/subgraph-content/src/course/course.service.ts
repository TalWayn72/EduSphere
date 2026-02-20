import { Injectable, Logger } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, desc } from '@edusphere/db';

interface CreateCourseInput {
  tenantId?: string;
  title: string;
  slug?: string;
  description?: string;
  instructorId?: string;
  creatorId?: string;
  thumbnailUrl?: string;
  estimatedHours?: number;
  isPublished?: boolean;
}

interface UpdateCourseInput {
  title?: string;
  description?: string;
  slug?: string;
  thumbnailUrl?: string;
  estimatedHours?: number;
}

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);
  private db = createDatabaseConnection();

  private mapCourse(course: Record<string, unknown> | null | undefined) {
    if (!course) return null;
    return {
      ...course,
      tenantId: course['tenant_id'] || course['tenantId'] || '',
      instructorId: course['instructor_id'] || course['creator_id'] || course['instructorId'] || '',
      isPublished: course['is_published'] !== undefined
        ? course['is_published']
        : (course['isPublished'] || course['is_public'] || false),
      slug: course['slug'] || '',
      thumbnailUrl: course['thumbnail_url'] || course['thumbnailUrl'] || null,
      estimatedHours: course['estimated_hours'] !== undefined
        ? course['estimated_hours']
        : (course['estimatedHours'] || null),
    };
  }

  async findById(id: string) {
    const [course] = await this.db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, id))
      .limit(1);
    return this.mapCourse(course as Record<string, unknown>) || null;
  }

  async findAll(limit: number, offset: number) {
    const rows = await this.db
      .select()
      .from(schema.courses)
      .orderBy(desc(schema.courses.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map((c) => this.mapCourse(c as Record<string, unknown>));
  }

  async create(input: CreateCourseInput) {
    const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const instructorId = input.instructorId || input.creatorId || '';
    const [course] = await this.db
      .insert(schema.courses)
      .values({
        tenantId: input.tenantId ?? '',
        title: input.title,
        slug,
        description: input.description,
        instructorId,
        isPublished: input.isPublished || false,
        thumbnailUrl: input.thumbnailUrl,
        estimatedHours: input.estimatedHours,
      })
      .returning();
    this.logger.log(`Course created: ${course?.id} - "${input.title}"`);
    return this.mapCourse(course as Record<string, unknown>);
  }

  async update(id: string, input: UpdateCourseInput) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.slug !== undefined) updateData['slug'] = input.slug;
    if (input.thumbnailUrl !== undefined) updateData['thumbnailUrl'] = input.thumbnailUrl;
    if (input.estimatedHours !== undefined) updateData['estimatedHours'] = input.estimatedHours;

    const [course] = await this.db
      .update(schema.courses)
      .set(updateData)
      .where(eq(schema.courses.id, id))
      .returning();
    return this.mapCourse(course as Record<string, unknown>);
  }
}
