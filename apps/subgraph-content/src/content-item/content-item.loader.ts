import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import {
  ContentItemService,
  ContentItemMapped,
} from './content-item.service.js';

/**
 * ContentItemLoader — NestJS-injectable DataLoader that batches multiple
 * individual findByModule(moduleId) calls into a single
 * SELECT ... WHERE module_id IN (...) database query per request tick.
 *
 * Solves the N+1 query problem when resolving contentItems for a list of modules.
 *
 * Also provides byId for federation @ResolveReference batching:
 * batches multiple individual findById(id) calls into a single
 * SELECT ... WHERE id IN (...) database query per request tick.
 */
@Injectable()
export class ContentItemLoader {
  readonly byModuleId: DataLoader<string, ContentItemMapped[]>;
  readonly byId: DataLoader<string, ContentItemMapped>;

  constructor(private readonly contentItemService: ContentItemService) {
    this.byModuleId = new DataLoader<string, ContentItemMapped[]>(
      async (moduleIds: readonly string[]): Promise<ContentItemMapped[][]> => {
        const batchMap = await this.contentItemService.findByModuleIdBatch([
          ...moduleIds,
        ]);

        // DataLoader requires results in the SAME ORDER as the input keys
        return moduleIds.map((id) => batchMap.get(id) ?? []);
      },
      { cache: false } // Disable per-request caching — NestJS DI handles scope
    );

    this.byId = new DataLoader<string, ContentItemMapped>(
      async (
        ids: readonly string[]
      ): Promise<(ContentItemMapped | Error)[]> => {
        const batchMap = await this.contentItemService.findByIdBatch([...ids]);

        // DataLoader requires results in the SAME ORDER as the input keys
        return ids.map(
          (id) =>
            batchMap.get(id) ?? new Error(`ContentItem with ID ${id} not found`)
        );
      },
      { cache: false } // Disable per-request caching — NestJS DI handles scope
    );
  }
}
