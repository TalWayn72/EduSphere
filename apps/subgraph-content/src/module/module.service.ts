import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { modules, NewModule } from '@edusphere/db';
import { eq, asc, inArray } from 'drizzle-orm';

@Injectable()
export class ModuleService {
  async findById(id: string) {
    const [module] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1);

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return module;
  }

  async findByCourse(courseId: string) {
    return db
      .select()
      .from(modules)
      .where(eq(modules.course_id, courseId))
      .orderBy(asc(modules.order_index));
  }

  async create(input: Partial<NewModule>) {
    const [module] = await db
      .insert(modules)
      .values(input as NewModule)
      .returning();

    return module;
  }

  async update(id: string, input: Partial<NewModule>) {
    const [updated] = await db
      .update(modules)
      .set(input)
      .where(eq(modules.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(modules).where(eq(modules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorder(courseId: string, moduleIds: string[]) {
    // Update order_index for all modules
    const updates = moduleIds.map((id, index) =>
      db.update(modules).set({ order_index: index }).where(eq(modules.id, id))
    );

    await Promise.all(updates);

    // Return reordered modules
    return db
      .select()
      .from(modules)
      .where(inArray(modules.id, moduleIds))
      .orderBy(asc(modules.order_index));
  }
}
