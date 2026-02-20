import {
  Resolver,
  Query,
  Args,
  ResolveReference,
} from '@nestjs/graphql';
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

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.contentItemService.findById(reference.id);
  }
}
