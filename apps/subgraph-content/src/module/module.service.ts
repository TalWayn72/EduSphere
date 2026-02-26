import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  asc,
  inArray,
  closeAllPools,
} from '@edusphere/db';

type DbModule = typeof schema.modules.$inferSelect;

interface ModuleInput {
  courseId?: string;
  title?: string;
  description?: string;
  orderIndex?: number;
}

@Injectable()
export class ModuleService implements OnModuleDestroy {
  private readonly logger = new Logger(ModuleService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private mapModule(row: DbModule) {
    return {
      ...row,
      courseId: row.course_id,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.modules)
      .where(eq(schema.modules.id, id))
      .limit(1);

    if (!row) {
      this.logger.warn(`Module not found: ${id}`);
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return this.mapModule(row);
  }

  async findByCourse(courseId: string) {
    this.logger.debug(`Fetching modules for course: ${courseId}`);
    const rows = await this.db
      .select()
      .from(schema.modules)
      .where(eq(schema.modules.course_id, courseId))
      .orderBy(asc(schema.modules.order_index));
    return rows.map((r) => this.mapModule(r));
  }

  async create(input: ModuleInput) {
    this.logger.debug(`Creating module for course: ${input.courseId}`);
    const [row] = await this.db
      .insert(schema.modules)
      .values({
        course_id: input.courseId ?? '',
        title: input.title ?? '',
        description: input.description,
        order_index: input.orderIndex ?? 0,
      })
      .returning();

    if (!row) {
      throw new Error('Failed to create module');
    }

    return this.mapModule(row);
  }

  async update(id: string, input: ModuleInput) {
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.description !== undefined)
      updateData['description'] = input.description;
    if (input.orderIndex !== undefined)
      updateData['order_index'] = input.orderIndex;

    const [row] = await this.db
      .update(schema.modules)
      .set(updateData)
      .where(eq(schema.modules.id, id))
      .returning();

    if (!row) {
      this.logger.warn(`Module not found for update: ${id}`);
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return this.mapModule(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.modules)
      .where(eq(schema.modules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorder(courseId: string, moduleIds: string[]) {
    this.logger.debug(
      `Reordering ${moduleIds.length} modules in course: ${courseId}`
    );
    const updates = moduleIds.map((id, index) =>
      this.db
        .update(schema.modules)
        .set({ order_index: index })
        .where(eq(schema.modules.id, id))
    );

    await Promise.all(updates);

    const rows = await this.db
      .select()
      .from(schema.modules)
      .where(inArray(schema.modules.id, moduleIds))
      .orderBy(asc(schema.modules.order_index));

    return rows.map((r) => this.mapModule(r));
  }
}
