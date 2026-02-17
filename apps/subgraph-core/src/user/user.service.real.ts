import { Injectable } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, withTenantContext } from '@edusphere/db';
import type { Database } from '@edusphere/db';

@Injectable()
export class UserService {
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async findById(id: string, tenantId?: string) {
    if (tenantId) {
      return withTenantContext(this.db, tenantId, async () => {
        const [user] = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, id))
          .limit(1);
        return user || null;
      });
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return user || null;
  }

  async findAll(limit: number, offset: number, tenantId?: string) {
    if (tenantId) {
      return withTenantContext(this.db, tenantId, async () => {
        return this.db
          .select()
          .from(schema.users)
          .limit(limit)
          .offset(offset);
      });
    }

    return this.db
      .select()
      .from(schema.users)
      .limit(limit)
      .offset(offset);
  }

  async create(input: any, tenantId: string) {
    return withTenantContext(this.db, tenantId, async () => {
      const [user] = await this.db
        .insert(schema.users)
        .values({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          tenantId: input.tenantId || tenantId,
        })
        .returning();
      return user;
    });
  }

  async update(id: string, input: any, tenantId: string) {
    return withTenantContext(this.db, tenantId, async () => {
      const [user] = await this.db
        .update(schema.users)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    });
  }
}
