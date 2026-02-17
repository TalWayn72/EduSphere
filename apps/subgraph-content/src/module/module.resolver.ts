import { Resolver, Query, Mutation, Args, ResolveField, Parent, ResolveReference } from '@nestjs/graphql';
import { ModuleService } from './module.service';

@Resolver('Module')
export class ModuleResolver {
  constructor(private readonly moduleService: ModuleService) {}

  @Query('module')
  async getModule(@Args('id') id: string) {
    return this.moduleService.findById(id);
  }

  @Query('modulesByCourse')
  async getModulesByCourse(@Args('courseId') courseId: string) {
    return this.moduleService.findByCourse(courseId);
  }

  @Mutation('createModule')
  async createModule(@Args('input') input: any) {
    return this.moduleService.create(input);
  }

  @Mutation('updateModule')
  async updateModule(@Args('id') id: string, @Args('input') input: any) {
    return this.moduleService.update(id, input);
  }

  @Mutation('deleteModule')
  async deleteModule(@Args('id') id: string) {
    return this.moduleService.delete(id);
  }

  @Mutation('reorderModules')
  async reorderModules(
    @Args('courseId') courseId: string,
    @Args('moduleIds') moduleIds: string[],
  ) {
    return this.moduleService.reorder(courseId, moduleIds);
  }

  @ResolveField('contentItems')
  async getContentItems(@Parent() module: any) {
    // Will be resolved by ContentItem resolver
    return [];
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.moduleService.findById(reference.id);
  }
}
