import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, closeAllPools } from '@edusphere/db';
import type { Database } from '@edusphere/db';

@Injectable()
export class TenantService implements OnModuleDestroy {
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async findById(id: string) {
    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, id))
      .limit(1);
    return tenant || null;
  }

  async findAll(limit: number, offset: number) {
    return this.db.select().from(schema.tenants).limit(limit).offset(offset);
  }
}
