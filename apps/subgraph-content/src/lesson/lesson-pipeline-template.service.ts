import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  or,
} from '@edusphere/db';
import { z } from 'zod';

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const ALLOWED_MODULE_TYPES = [
  'INGESTION',
  'ASR',
  'NER_SOURCE_LINKING',
  'CONTENT_CLEANING',
  'SUMMARIZATION',
  'STRUCTURED_NOTES',
  'DIAGRAM_GENERATOR',
  'CITATION_VERIFIER',
  'QA_GATE',
  'PUBLISH_SHARE',
] as const;

const pipelineNodeSchema = z
  .object({
    moduleType: z.enum(ALLOWED_MODULE_TYPES),
  })
  .passthrough();

const flatConfigSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .default({});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  nodes: z.array(pipelineNodeSchema).min(1),
  config: flatConfigSchema.optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  nodes: z.array(pipelineNodeSchema).min(1).optional(),
  config: flatConfigSchema.optional(),
});

// ─── Exported Input Types ──────────────────────────────────────────────────

export type CreatePipelineTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdatePipelineTemplateInput = z.infer<typeof updateTemplateSchema>;

// ─── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class LessonPipelineTemplateService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPipelineTemplateService.name);
  private readonly db = createDatabaseConnection();
  private readonly tbl = schema.lesson_pipeline_templates;

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log(
      '[LessonPipelineTemplateService] DB pools closed on destroy'
    );
  }

  private mapRow(row: typeof this.tbl.$inferSelect) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      nodes: row.nodes,
      config: row.config,
      isSystem: row.is_system,
      createdBy: row.created_by,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  async findAll(tenantId: string) {
    const rows = await this.db
      .select()
      .from(this.tbl)
      .where(
        or(eq(this.tbl.tenant_id, tenantId), eq(this.tbl.is_system, true))
      );
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(this.tbl)
      .where(eq(this.tbl.id, id))
      .limit(1);
    if (!row) return null;
    return this.mapRow(row);
  }

  async create(
    input: CreatePipelineTemplateInput,
    tenantId: string,
    userId: string
  ) {
    const parsed = createTemplateSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((i) => i.message).join('; ')
      );
    }
    const { name, description, nodes, config } = parsed.data;
    const rows = await this.db
      .insert(this.tbl)
      .values({
        tenant_id: tenantId,
        name,
        description: description ?? null,
        nodes,
        config: config ?? {},
        is_system: false,
        created_by: userId,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new BadRequestException('Failed to create template');
    this.logger.log({
      msg: 'Template created',
      tenantId,
      userId,
      templateId: row.id,
    });
    return this.mapRow(row);
  }

  async update(
    id: string,
    input: UpdatePipelineTemplateInput,
    tenantId: string
  ) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Template "${id}" not found`);
    if (existing.isSystem)
      throw new BadRequestException('Cannot modify system templates');

    const parsed = updateTemplateSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((i) => i.message).join('; ')
      );
    }
    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates['name'] = parsed.data.name;
    if (parsed.data.description !== undefined)
      updates['description'] = parsed.data.description;
    if (parsed.data.nodes !== undefined) updates['nodes'] = parsed.data.nodes;
    if (parsed.data.config !== undefined)
      updates['config'] = parsed.data.config;

    const updateRows = await this.db
      .update(this.tbl)
      .set(updates)
      .where(and(eq(this.tbl.id, id), eq(this.tbl.tenant_id, tenantId)))
      .returning();
    const updated = updateRows[0];
    if (!updated)
      throw new NotFoundException(`Template "${id}" not found for tenant`);
    this.logger.log({ msg: 'Template updated', tenantId, templateId: id });
    return this.mapRow(updated);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Template "${id}" not found`);
    if (existing.isSystem)
      throw new BadRequestException('Cannot delete system templates');

    const deleted = await this.db
      .delete(this.tbl)
      .where(and(eq(this.tbl.id, id), eq(this.tbl.tenant_id, tenantId)))
      .returning();
    if (deleted.length === 0)
      throw new NotFoundException(`Template "${id}" not found for tenant`);
    this.logger.log({ msg: 'Template deleted', tenantId, templateId: id });
    return true;
  }
}
