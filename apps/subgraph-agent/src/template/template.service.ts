import { Injectable } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, desc } from '@edusphere/db';

@Injectable()
export class TemplateService {
  private db = createDatabaseConnection();

  async findById(id: string) {
    const [template] = await this.db
      .select()
      .from(schema.agent_definitions)
      .where(eq(schema.agent_definitions.id, id))
      .limit(1);
    return template || null;
  }

  async findAll(limit: number, offset: number) {
    return this.db
      .select()
      .from(schema.agent_definitions)
      .orderBy(desc(schema.agent_definitions.created_at))
      .limit(limit)
      .offset(offset);
  }

  async findByType(template: string) {
    return this.db
      .select()
      .from(schema.agent_definitions)
      .where(eq(schema.agent_definitions.template, template as any))
      .orderBy(desc(schema.agent_definitions.created_at));
  }

  async create(input: any) {
    const [template] = await this.db
      .insert(schema.agent_definitions)
      .values({
        tenant_id: input.tenantId,
        creator_id: input.creatorId,
        name: input.name,
        template: input.template,
        config: input.config || {},
        is_active: true,
      })
      .returning();
    return template;
  }

  async update(id: string, input: any) {
    const updateData: any = {
      updated_at: new Date(),
    };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.config !== undefined) updateData.config = input.config;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const [template] = await this.db
      .update(schema.agent_definitions)
      .set(updateData)
      .where(eq(schema.agent_definitions.id, id))
      .returning();
    return template;
  }

  async delete(id: string) {
    await this.db
      .update(schema.agent_definitions)
      .set({ deleted_at: new Date() })
      .where(eq(schema.agent_definitions.id, id));
    return true;
  }

  async activate(id: string) {
    const [template] = await this.db
      .update(schema.agent_definitions)
      .set({ is_active: true, updated_at: new Date() })
      .where(eq(schema.agent_definitions.id, id))
      .returning();
    return template;
  }

  async deactivate(id: string) {
    const [template] = await this.db
      .update(schema.agent_definitions)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(schema.agent_definitions.id, id))
      .returning();
    return template;
  }
}
