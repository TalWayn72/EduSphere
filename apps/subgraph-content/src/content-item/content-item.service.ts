import { Injectable } from '@nestjs/common';
import { createDatabaseConnection, schema, eq } from '@edusphere/db';

@Injectable()
export class ContentItemService {
  private db = createDatabaseConnection();

  async findById(id: string) {
    const [item] = await this.db
      .select()
      .from(schema.media_assets)
      .where(eq(schema.media_assets.id, id))
      .limit(1);
    return item || null;
  }

  async findByModule(moduleId: string) {
    return this.db
      .select()
      .from(schema.media_assets)
      .where(eq(schema.media_assets.module_id, moduleId));
  }
}
