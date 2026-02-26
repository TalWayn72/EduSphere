import { Resolver, Query, Args, ResolveReference } from '@nestjs/graphql';
import { ContentItemService } from './content-item.service';
import { ContentItemLoader } from './content-item.loader';

@Resolver('ContentItem')
export class ContentItemResolver {
  constructor(
    private readonly contentItemService: ContentItemService,
    private readonly contentItemLoader: ContentItemLoader
  ) {}

  @Query('contentItem')
  async getContentItem(@Args('id') id: string) {
    return this.contentItemService.findById(id);
  }

  @Query('contentItemsByModule')
  async getContentItemsByModule(@Args('moduleId') moduleId: string) {
    return this.contentItemService.findByModule(moduleId);
  }

  /**
   * ResolveReference uses ContentItemLoader byId (DataLoader) to batch
   * federation entity resolution calls into one DB query per request tick,
   * eliminating the N+1 problem for @ResolveReference.
   */
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.contentItemLoader.byId.load(reference.id);
  }
}
