import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ModuleService } from './module.service.js';

type ModuleMapped = Awaited<
  ReturnType<ModuleService['findByCourseIdBatch']>
> extends Map<string, infer V>
  ? V[number]
  : never;

/**
 * ModuleLoader — NestJS-injectable DataLoader that batches multiple
 * individual findByCourse(courseId) calls into a single
 * SELECT ... WHERE course_id IN (...) database query per request tick.
 *
 * Solves the N+1 query problem when resolving modules for a list of courses.
 *
 * Also provides byId for federation @ResolveReference batching:
 * batches multiple individual findById(id) calls into a single
 * SELECT ... WHERE id IN (...) database query per request tick.
 */
@Injectable()
export class ModuleLoader {
  readonly byCourseId: DataLoader<string, ModuleMapped[]>;
  readonly byId: DataLoader<string, ModuleMapped>;

  constructor(private readonly moduleService: ModuleService) {
    this.byCourseId = new DataLoader<string, ModuleMapped[]>(
      async (courseIds: readonly string[]): Promise<ModuleMapped[][]> => {
        const batchMap = await this.moduleService.findByCourseIdBatch([
          ...courseIds,
        ]);

        // DataLoader requires results in the SAME ORDER as the input keys
        return courseIds.map((id) => batchMap.get(id) ?? []);
      },
      { cache: false } // Disable per-request caching — NestJS DI handles scope
    );

    this.byId = new DataLoader<string, ModuleMapped>(
      async (ids: readonly string[]): Promise<(ModuleMapped | Error)[]> => {
        const batchMap = await this.moduleService.findByIdBatch([...ids]);

        // DataLoader requires results in the SAME ORDER as the input keys
        return ids.map(
          (id) =>
            batchMap.get(id) ?? new Error(`Module with ID ${id} not found`)
        );
      },
      { cache: false } // Disable per-request caching — NestJS DI handles scope
    );
  }
}
