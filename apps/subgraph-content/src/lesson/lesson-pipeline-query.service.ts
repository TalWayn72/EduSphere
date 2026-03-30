/**
 * Read-only queries and mappers for lesson pipelines and pipeline runs.
 * Extracted from LessonPipelineService for file-size compliance.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  desc,
  sql,
  closeAllPools,
} from '@edusphere/db';

@Injectable()
export class LessonPipelineQueryService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPipelineQueryService.name);
  readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  mapPipeline(row: Record<string, unknown> | null | undefined) {
    if (!row) return null;
    return {
      id: row['id'],
      lessonId: row['lesson_id'] ?? row['lessonId'],
      templateName: row['template_name'] ?? null,
      nodes: row['nodes'] ?? [],
      config: row['config'] ?? {},
      status: row['status'],
      createdAt: row['created_at'] ? String(row['created_at']) : null,
    };
  }

  mapRun(row: Record<string, unknown> | null | undefined) {
    if (!row) return null;
    return {
      id: row['id'],
      pipelineId: row['pipeline_id'] ?? row['pipelineId'],
      lessonId: row['lesson_id'] ?? row['lessonId'] ?? null,
      runNumber: row['run_number'] ?? row['runNumber'] ?? 1,
      triggeredBy: row['triggered_by'] ?? row['triggeredBy'] ?? 'MANUAL',
      startedAt: row['started_at'] ? String(row['started_at']) : null,
      completedAt: row['completed_at'] ? String(row['completed_at']) : null,
      status: row['status'],
      logs: row['logs'] ?? [],
    };
  }

  async findByLesson(lessonId: string) {
    const [row] = await this.db
      .select()
      .from(schema.lesson_pipelines)
      .where(eq(schema.lesson_pipelines.lesson_id, lessonId))
      .orderBy(desc(schema.lesson_pipelines.created_at))
      .limit(1);
    return this.mapPipeline(row as Record<string, unknown>);
  }

  async findRunById(runId: string) {
    const [row] = await this.db
      .select()
      .from(schema.lesson_pipeline_runs)
      .where(eq(schema.lesson_pipeline_runs.id, runId))
      .limit(1);
    return this.mapRun(row as Record<string, unknown>);
  }

  async findCurrentRunByPipeline(pipelineId: string) {
    const [row] = await this.db
      .select()
      .from(schema.lesson_pipeline_runs)
      .where(eq(schema.lesson_pipeline_runs.pipeline_id, pipelineId))
      .orderBy(desc(schema.lesson_pipeline_runs.started_at))
      .limit(1);
    return this.mapRun(row as Record<string, unknown>);
  }

  async findResultsByRunId(runId: string) {
    const rows = await this.db
      .select()
      .from(schema.lesson_pipeline_results)
      .where(eq(schema.lesson_pipeline_results.run_id, runId));
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      moduleName: r.module_name,
      outputType: r.output_type,
      outputData: r.output_data,
      fileUrl: r.file_url ?? null,
      createdAt: String(r.created_at),
    }));
  }

  async getNextRunNumber(lessonId: string): Promise<number> {
    const [result] = await this.db
      .select({
        maxRun: sql<number>`COALESCE(MAX(${schema.lesson_pipeline_runs.run_number}), 0)`,
      })
      .from(schema.lesson_pipeline_runs)
      .where(eq(schema.lesson_pipeline_runs.lesson_id, lessonId));
    return (Number(result?.maxRun) || 0) + 1;
  }

  async findRunHistory(lessonId: string, limit = 10) {
    const rows = await this.db
      .select()
      .from(schema.lesson_pipeline_runs)
      .where(eq(schema.lesson_pipeline_runs.lesson_id, lessonId))
      .orderBy(desc(schema.lesson_pipeline_runs.run_number))
      .limit(limit);
    return rows.map((r) => this.mapRun(r as Record<string, unknown>));
  }
}
