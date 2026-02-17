import { Resolver, Query, Mutation, Args, ResolveReference } from '@nestjs/graphql';
import { ContentItemService } from './content-item.service';

@Resolver('ContentItem')
export class ContentItemResolver {
  constructor(private readonly contentItemService: ContentItemService) {}

  @Query('contentItem')
  async getContentItem(@Args('id') id: string) {
    return this.contentItemService.findById(id);
  }

  @Query('contentItemsByModule')
  async getContentItemsByModule(@Args('moduleId') moduleId: string) {
    return this.contentItemService.findByModule(moduleId);
  }

  @Query('contentItemsByType')
  async getContentItemsByType(
    @Args('moduleId') moduleId: string,
    @Args('type') type: string,
  ) {
    return this.contentItemService.findByType(moduleId, type);
  }

  @Mutation('createContentItem')
  async createContentItem(@Args('input') input: any) {
    return this.contentItemService.create(input);
  }

  @Mutation('updateContentItem')
  async updateContentItem(@Args('id') id: string, @Args('input') input: any) {
    return this.contentItemService.update(id, input);
  }

  @Mutation('deleteContentItem')
  async deleteContentItem(@Args('id') id: string) {
    return this.contentItemService.delete(id);
  }

  @Mutation('reorderContentItems')
  async reorderContentItems(
    @Args('moduleId') moduleId: string,
    @Args('itemIds') itemIds: string[],
  ) {
    return this.contentItemService.reorder(moduleId, itemIds);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.contentItemService.findById(reference.id);
  }
}
