import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  desc,
  ilike,
  or,
  closeAllPools,
  withReadReplica,
} from '@edusphere/db';

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
export class CourseService implements OnModuleDestroy {
  private readonly logger = new Logger(CourseService.name);
  private db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private mapCourse(course: Record<string, unknown> | null | undefined) {
    if (!course) return null;
    return {
      ...course,
      tenantId: course['tenant_id'] || course['tenantId'] || '',
      instructorId:
        course['instructor_id'] ||
        course['creator_id'] ||
        course['instructorId'] ||
        '',
      isPublished:
        course['is_published'] !== undefined
          ? course['is_published']
          : course['isPublished'] || course['is_public'] || false,
      slug: course['slug'] || '',
      thumbnailUrl: course['thumbnail_url'] || course['thumbnailUrl'] || null,
      estimatedHours:
        course['estimated_hours'] !== undefined
          ? course['estimated_hours']
          : course['estimatedHours'] || null,
      forkedFromId:
        course['forked_from_id'] || course['forkedFromId'] || null,
      // content.ts schema uses snake_case timestamps via the ...timestamps helper
      createdAt: course['created_at'] || course['createdAt'] || null,
      updatedAt: course['updated_at'] || course['updatedAt'] || null,
    };
  }

  async findById(id: string) {
    const [course] = await withReadReplica((db) =>
      db.select().from(schema.courses).where(eq(schema.courses.id, id)).limit(1)
    );
    return this.mapCourse(course as Record<string, unknown>) || null;
  }

  async findAll(limit: number, offset: number) {
    try {
      const rows = await withReadReplica((db) =>
        db
          .select()
          .from(schema.courses)
          .orderBy(desc(schema.courses.created_at))
          .limit(limit)
          .offset(offset)
      );
      return rows.map((c) => this.mapCourse(c as Record<string, unknown>));
    } catch (err) {
      this.logger.error(`Failed to fetch courses: ${String(err)}`);
      throw new BadRequestException('Failed to fetch courses. Please try again.');
    }
  }

  async search(query: string, limit: number = 20) {
    if (!query || query.trim().length < 2) return [];
    const pattern = `%${query.trim()}%`;
    try {
      const rows = await withReadReplica((db) =>
        db
          .select()
          .from(schema.courses)
          .where(
            or(
              ilike(schema.courses.title, pattern),
              ilike(schema.courses.description, pattern)
            )
          )
          .orderBy(desc(schema.courses.created_at))
          .limit(limit)
      );
      this.logger.log(
        `[CourseService] searchCourses("${query}") returned ${rows.length} results`
      );
      return rows.map((c) => this.mapCourse(c as Record<string, unknown>));
    } catch (err) {
      this.logger.error(
        `[CourseService] searchCourses("${query}") failed: ${String(err)}`
      );
      throw new BadRequestException('Failed to search courses. Please try again.');
    }
  }

  async create(input: CreateCourseInput) {
    const rawSlug = (
      input.slug ?? input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    ).replace(/^-+|-+$/g, '');
    const slug = rawSlug || `course-${Date.now().toString(36)}`;
    const instructorId = input.instructorId || input.creatorId || '';
    try {
      const [course] = await this.db
        .insert(schema.courses)
        .values({
          tenant_id: input.tenantId ?? '',
          title: input.title,
          slug,
          description: input.description,
          instructor_id: instructorId,
          is_published: input.isPublished || false,
          thumbnail_url: input.thumbnailUrl,
          estimated_hours: input.estimatedHours,
        })
        .returning();
      this.logger.log(`Course created: ${course?.id} - "${input.title}"`);
      return this.mapCourse(course as Record<string, unknown>);
    } catch (err) {
      this.logger.error(
        `Failed to create course "${input.title}": ${String(err)}`
      );
      throw new BadRequestException('Failed to create course.');
    }
  }

  async setPublished(id: string, isPublished: boolean) {
    try {
      const [course] = await this.db
        .update(schema.courses)
        .set({ is_published: isPublished })
        .where(eq(schema.courses.id, id))
        .returning();
      this.logger.log(
        `Course ${isPublished ? 'published' : 'unpublished'}: ${id}`
      );
      return this.mapCourse(course as Record<string, unknown>);
    } catch (err) {
      this.logger.error(
        `Failed to ${isPublished ? 'publish' : 'unpublish'} course "${id}": ${String(err)}`
      );
      throw new BadRequestException(
        `Failed to ${isPublished ? 'publish' : 'unpublish'} course.`
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const [course] = await this.db
        .update(schema.courses)
        .set({ deleted_at: new Date() })
        .where(eq(schema.courses.id, id))
        .returning();
      this.logger.log(`Course soft-deleted: ${id}`);
      return !!course;
    } catch (err) {
      this.logger.error(`Failed to delete course "${id}": ${String(err)}`);
      throw new BadRequestException('Failed to delete course.');
    }
  }

  async update(id: string, input: UpdateCourseInput) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.description !== undefined)
      updateData['description'] = input.description;
    if (input.slug !== undefined) updateData['slug'] = input.slug;
    if (input.thumbnailUrl !== undefined)
      updateData['thumbnailUrl'] = input.thumbnailUrl;
    if (input.estimatedHours !== undefined)
      updateData['estimatedHours'] = input.estimatedHours;

    try {
      const [course] = await this.db
        .update(schema.courses)
        .set(updateData)
        .where(eq(schema.courses.id, id))
        .returning();
      return this.mapCourse(course as Record<string, unknown>);
    } catch (err) {
      this.logger.error(`Failed to update course "${id}": ${String(err)}`);
      throw new BadRequestException('Failed to update course.');
    }
  }

  async forkCourse(courseId: string, newOwnerId: string, tenantId: string) {
    const original = await this.findById(courseId);
    if (!original) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }
    // Access raw properties via index since mapCourse spreads Record<string, unknown>
    const src = original as Record<string, unknown>;
    const newSlug = `${String(src['slug'] ?? '')}-fork-${Date.now().toString(36)}`;
    try {
      const [forked] = await this.db
        .insert(schema.courses)
        .values({
          tenant_id: tenantId,
          title: `${String(src['title'] ?? '')} (Fork)`,
          slug: newSlug,
          description: src['description'] as string | undefined,
          instructor_id: newOwnerId,
          is_published: false,
          thumbnail_url: src['thumbnailUrl'] as string | null | undefined,
          estimated_hours: src['estimatedHours'] as number | null | undefined,
          forked_from_id: courseId,
        })
        .returning();
      this.logger.log(
        `[CourseService] Course forked: ${courseId} → ${String(forked?.id)} by user ${newOwnerId}`
      );
      return this.mapCourse(forked as Record<string, unknown>);
    } catch (err) {
      this.logger.error(
        `[CourseService] Failed to fork course "${courseId}": ${String(err)}`
      );
      throw new BadRequestException('Failed to fork course.');
    }
  }
}
