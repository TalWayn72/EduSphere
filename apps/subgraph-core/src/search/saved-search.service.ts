import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
} from '@edusphere/db';

interface CreateSavedSearchInput {
  userId: string;
  tenantId: string;
  name: string;
  query: string;
  filters?: Record<string, unknown>;
}

@Injectable()
export class SavedSearchService implements OnModuleDestroy {
  private readonly logger = new Logger(SavedSearchService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async createSavedSearch(input: CreateSavedSearchInput) {
    try {
      const [saved] = await this.db
        .insert(schema.savedSearches)
        .values({
          userId: input.userId,
          tenantId: input.tenantId,
          name: input.name,
          query: input.query,
          filters: input.filters ?? null,
        })
        .returning();
      this.logger.log(
        `[SavedSearchService] Created saved search "${input.name}" for user ${input.userId}`
      );
      return saved;
    } catch (err) {
      this.logger.error(
        `[SavedSearchService] Failed to create saved search: ${String(err)}`
      );
      throw new Error('Failed to save search.');
    }
  }

  async listSavedSearches(userId: string, tenantId: string) {
    try {
      return await this.db
        .select()
        .from(schema.savedSearches)
        .where(
          and(
            eq(schema.savedSearches.userId, userId),
            eq(schema.savedSearches.tenantId, tenantId)
          )
        );
    } catch (err) {
      this.logger.error(
        `[SavedSearchService] Failed to list saved searches: ${String(err)}`
      );
      throw new Error('Failed to fetch saved searches.');
    }
  }

  async deleteSavedSearch(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const [found] = await this.db
      .select()
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.id, id))
      .limit(1);
    if (!found) throw new NotFoundException(`Saved search ${id} not found`);
    if (found.userId !== userId || found.tenantId !== tenantId) {
      throw new ForbiddenException("Cannot delete another user's saved search");
    }
    try {
      await this.db
        .delete(schema.savedSearches)
        .where(eq(schema.savedSearches.id, id));
      this.logger.log(
        `[SavedSearchService] Deleted saved search ${id} for user ${userId}`
      );
      return true;
    } catch (err) {
      this.logger.error(
        `[SavedSearchService] Failed to delete saved search ${id}: ${String(err)}`
      );
      throw new Error('Failed to delete saved search.');
    }
  }
}
