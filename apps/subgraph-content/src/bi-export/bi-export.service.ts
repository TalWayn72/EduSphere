/**
 * BiExportService — provides OData v4 analytics feeds for BI tools (Power BI, Tableau).
 * Returns data in OData JSON format with @odata.context, @odata.count, and value array.
 * Memory safety: OnModuleDestroy calls closeAllPools().
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection, closeAllPools, schema, withTenantContext, eq, and, isNotNull, desc, asc,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface ODataParams {
  top?: number;
  skip?: number;
  filter?: string;
  orderby?: string;
}

export interface ODataResponse<T> {
  '@odata.context': string;
  '@odata.count': number;
  value: T[];
}

const BASE_URL = 'http://localhost:4002/odata/v1';
const DEFAULT_TOP = 100;
const MAX_TOP = 1000;

@Injectable()
export class BiExportService implements OnModuleDestroy {
  private readonly logger = new Logger(BiExportService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private resolveTop(params: ODataParams): number {
    return Math.min(params.top ?? DEFAULT_TOP, MAX_TOP);
  }

  private buildCtx(tenantId: string): TenantContext {
    return { tenantId, userId: 'bi-export', userRole: 'ORG_ADMIN' };
  }

  async getEnrollments(tenantId: string, params: ODataParams): Promise<ODataResponse<Record<string, unknown>>> {
    const top = this.resolveTop(params);
    const skip = params.skip ?? 0;
    const ctx = this.buildCtx(tenantId);

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select({
        id: schema.userCourses.id,
        userId: schema.userCourses.userId,
        courseId: schema.userCourses.courseId,
        status: schema.userCourses.status,
        enrolledAt: schema.userCourses.enrolledAt,
        completedAt: schema.userCourses.completedAt,
      })
        .from(schema.userCourses)
        .limit(top)
        .offset(skip),
    );

    this.logger.debug({ tenantId, count: rows.length }, 'getEnrollments');
    return {
      '@odata.context': `${BASE_URL}/$metadata#Enrollments`,
      '@odata.count': rows.length,
      value: rows,
    };
  }

  async getCompletions(tenantId: string, params: ODataParams): Promise<ODataResponse<Record<string, unknown>>> {
    const top = this.resolveTop(params);
    const skip = params.skip ?? 0;
    const ctx = this.buildCtx(tenantId);

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select({
        id: schema.userProgress.id,
        userId: schema.userProgress.userId,
        contentItemId: schema.userProgress.contentItemId,
        completedAt: schema.userProgress.completedAt,
        timeSpent: schema.userProgress.timeSpent,
        progress: schema.userProgress.progress,
      })
        .from(schema.userProgress)
        .where(isNotNull(schema.userProgress.completedAt))
        .limit(top)
        .offset(skip),
    );

    this.logger.debug({ tenantId, count: rows.length }, 'getCompletions');
    return {
      '@odata.context': `${BASE_URL}/$metadata#Completions`,
      '@odata.count': rows.length,
      value: rows,
    };
  }

  async getQuizResults(tenantId: string, params: ODataParams): Promise<ODataResponse<Record<string, unknown>>> {
    const top = this.resolveTop(params);
    const skip = params.skip ?? 0;
    const ctx = this.buildCtx(tenantId);

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select({
        id: schema.quizResults.id,
        userId: schema.quizResults.userId,
        contentItemId: schema.quizResults.contentItemId,
        score: schema.quizResults.score,
        passed: schema.quizResults.passed,
        submittedAt: schema.quizResults.submittedAt,
      })
        .from(schema.quizResults)
        .where(eq(schema.quizResults.tenantId, tenantId))
        .orderBy(desc(schema.quizResults.submittedAt))
        .limit(top)
        .offset(skip),
    );

    this.logger.debug({ tenantId, count: rows.length }, 'getQuizResults');
    return {
      '@odata.context': `${BASE_URL}/$metadata#QuizResults`,
      '@odata.count': rows.length,
      value: rows,
    };
  }

  async getActivityLog(tenantId: string, params: ODataParams): Promise<ODataResponse<Record<string, unknown>>> {
    const top = this.resolveTop(params);
    const skip = params.skip ?? 0;
    const ctx = this.buildCtx(tenantId);

    // Use userProgress lastAccessedAt as daily activity proxy
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select({
        id: schema.userProgress.id,
        userId: schema.userProgress.userId,
        contentItemId: schema.userProgress.contentItemId,
        lastAccessedAt: schema.userProgress.lastAccessedAt,
        timeSpent: schema.userProgress.timeSpent,
        progress: schema.userProgress.progress,
      })
        .from(schema.userProgress)
        .orderBy(desc(schema.userProgress.lastAccessedAt))
        .limit(top)
        .offset(skip),
    );

    this.logger.debug({ tenantId, count: rows.length }, 'getActivityLog');
    return {
      '@odata.context': `${BASE_URL}/$metadata#ActivityLog`,
      '@odata.count': rows.length,
      value: rows,
    };
  }
}
