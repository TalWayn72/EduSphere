import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { ModuleService } from './module.service';
import { ContentItemLoader } from '../content-item/content-item.loader';

interface ModuleParent {
  id: string;
}

interface ModuleInput {
  courseId?: string;
  title?: string;
  description?: string;
  orderIndex?: number;
}

interface GraphQLContext {
  loaders?: {
    contentItems?: ContentItemLoader;
  };
}

@Resolver('Module')
export class ModuleResolver {
  constructor(
    private readonly moduleService: ModuleService,
    private readonly contentItemLoader: ContentItemLoader,
  ) {}

  @Query('module')
  async getModule(@Args('id') id: string) {
    return this.moduleService.findById(id);
  }

  @Query('modulesByCourse')
  async getModulesByCourse(@Args('courseId') courseId: string) {
    return this.moduleService.findByCourse(courseId);
  }

  @Mutation('createModule')
  async createModule(@Args('input') input: ModuleInput) {
    return this.moduleService.create(input);
  }

  @Mutation('updateModule')
  async updateModule(@Args('id') id: string, @Args('input') input: ModuleInput) {
    return this.moduleService.update(id, input);
  }

  @Mutation('deleteModule')
  async deleteModule(@Args('id') id: string) {
    return this.moduleService.delete(id);
  }

  @Mutation('reorderModules')
  async reorderModules(
    @Args('courseId') courseId: string,
    @Args('moduleIds') moduleIds: string[]
  ) {
    return this.moduleService.reorder(courseId, moduleIds);
  }

  /**
   * ResolveField uses ContentItemLoader (DataLoader) to batch all
   * contentItems requests for a list of modules into one DB query,
   * eliminating the N+1 problem.
   *
   * Falls back to the injected loader instance if the GraphQL context
   * does not carry a per-request loader (e.g. in unit tests).
   */
  @ResolveField('contentItems')
  async getContentItems(
    @Parent() mod: ModuleParent,
    @Context() ctx: GraphQLContext,
  ) {
    const loader = ctx.loaders?.contentItems ?? this.contentItemLoader;
    return loader.byModuleId.load(mod.id);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.moduleService.findById(reference.id);
  }
}
