import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ContentItemService, ContentItemMapped } from './content-item.service.js';

/**
 * ContentItemLoader — NestJS-injectable DataLoader that batches multiple
 * individual findByModule(moduleId) calls into a single
 * SELECT ... WHERE module_id IN (...) database query per request tick.
 *
 * Solves the N+1 query problem when resolving contentItems for a list of modules.
 */
@Injectable()
export class ContentItemLoader {
  readonly byModuleId: DataLoader<string, ContentItemMapped[]>;

  constructor(private readonly contentItemService: ContentItemService) {
    this.byModuleId = new DataLoader<string, ContentItemMapped[]>(
      async (moduleIds: readonly string[]): Promise<ContentItemMapped[][]> => {
        const batchMap = await this.contentItemService.findByModuleIdBatch([...moduleIds]);

        // DataLoader requires results in the SAME ORDER as the input keys
        return moduleIds.map((id) => batchMap.get(id) ?? []);
      },
      { cache: false }, // Disable per-request caching — NestJS DI handles scope
    );
  }
}
