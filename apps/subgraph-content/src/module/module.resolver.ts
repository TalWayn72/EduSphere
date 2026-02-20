import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  ResolveReference,
} from '@nestjs/graphql';
import { ModuleService } from './module.service';
import { ContentItemService } from '../content-item/content-item.service';

interface ModuleParent {
  id: string;
}

interface ModuleInput {
  courseId?: string;
  title?: string;
  description?: string;
  orderIndex?: number;
}

@Resolver('Module')
export class ModuleResolver {
  constructor(
    private readonly moduleService: ModuleService,
    private readonly contentItemService: ContentItemService,
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

  @ResolveField('contentItems')
  async getContentItems(@Parent() mod: ModuleParent) {
    return this.contentItemService.findByModule(mod.id);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.moduleService.findById(reference.id);
  }
}
