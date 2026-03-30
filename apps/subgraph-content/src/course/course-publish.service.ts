/**
 * CoursePublishService — Course readiness checks and publishing.
 *
 * Validates course readiness (title, description, lessons, pipeline results)
 * before allowing publication.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  isNull,
  count,
  withReadReplica,
} from '@edusphere/db';

interface CourseReadinessCheck {
  name: string;
  passed: boolean;
  message: string | null;
}

export interface CourseReadiness {
  ready: boolean;
  checks: CourseReadinessCheck[];
}

@Injectable()
export class CoursePublishService {
  private readonly logger = new Logger(CoursePublishService.name);
  private db = createDatabaseConnection();

  async checkCourseReadiness(
    courseId: string,
    findById: (id: string) => Promise<Record<string, unknown> | null>
  ): Promise<CourseReadiness> {
    const checks: CourseReadinessCheck[] = [];

    const course = await findById(courseId);
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);

    const hasTitle = !!course['title'] && String(course['title']).trim().length > 0;
    const hasDesc = !!course['description'] && String(course['description']).trim().length > 0;
    checks.push({
      name: 'has_title',
      passed: hasTitle,
      message: hasTitle ? null : 'Course must have a title',
    });
    checks.push({
      name: 'has_description',
      passed: hasDesc,
      message: hasDesc ? null : 'Course must have a description',
    });

    const lessons = await withReadReplica((db) =>
      db.select().from(schema.lessons).where(
        and(eq(schema.lessons.course_id, courseId), isNull(schema.lessons.deleted_at))
      )
    );
    const hasLessons = lessons.length > 0;
    checks.push({
      name: 'has_lessons',
      passed: hasLessons,
      message: hasLessons ? null : 'Course must have at least one lesson',
    });

    const allReady = hasLessons && lessons.every((l) => {
      const s = (l as Record<string, unknown>)['status'] as string;
      return s === 'READY' || s === 'PUBLISHED';
    });
    checks.push({
      name: 'lessons_ready',
      passed: allReady,
      message: allReady ? null : 'All lessons must have status READY or PUBLISHED',
    });

    let hasPipelineResults = false;
    if (hasLessons) {
      const lessonIds = lessons.map((l) => (l as Record<string, unknown>)['id'] as string);
      for (const lid of lessonIds) {
        const [result] = await withReadReplica((db) =>
          db.select({ cnt: count() })
            .from(schema.lesson_pipeline_runs)
            .where(eq(schema.lesson_pipeline_runs.lesson_id, lid))
            .limit(1)
        );
        if (result && Number(result.cnt) > 0) {
          hasPipelineResults = true;
          break;
        }
      }
    }
    checks.push({
      name: 'has_pipeline_results',
      passed: hasPipelineResults,
      message: hasPipelineResults ? null : 'At least one lesson must have pipeline results',
    });

    const ready = checks.every((c) => c.passed);
    this.logger.log(
      `[CoursePublishService] readiness check for ${courseId}: ready=${ready}, checks=${JSON.stringify(checks.map((c) => c.name + ':' + c.passed))}`
    );
    return { ready, checks };
  }

  async setPublished(
    id: string,
    isPublished: boolean,
    findById: (id: string) => Promise<Record<string, unknown> | null>,
    mapCourse: (c: Record<string, unknown> | null | undefined) => unknown
  ): Promise<unknown> {
    if (isPublished) {
      const readiness = await this.checkCourseReadiness(id, findById);
      if (!readiness.ready) {
        const failing = readiness.checks
          .filter((c) => !c.passed)
          .map((c) => c.message)
          .join('; ');
        this.logger.warn(
          `[CoursePublishService] Publish blocked for course ${id}: ${failing}`
        );
        throw new BadRequestException(
          `Course is not ready to publish: ${failing}`
        );
      }
    }
    try {
      const [course] = await this.db
        .update(schema.courses)
        .set({ is_published: isPublished })
        .where(eq(schema.courses.id, id))
        .returning();
      this.logger.log(
        `Course ${isPublished ? 'published' : 'unpublished'}: ${id}`
      );
      return mapCourse(course as Record<string, unknown>);
    } catch (err) {
      this.logger.error(
        `Failed to ${isPublished ? 'publish' : 'unpublish'} course "${id}": ${String(err)}`
      );
      throw new BadRequestException(
        `Failed to ${isPublished ? 'publish' : 'unpublish'} course.`
      );
    }
  }
}
