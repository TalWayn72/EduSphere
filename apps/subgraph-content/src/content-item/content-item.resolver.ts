import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { ContentItemService } from './content-item.service';
import type { CreateContentItemInput } from './content-item.service';
import { ContentItemLoader } from './content-item.loader';
import type { GraphQLContext } from '../auth/auth.middleware';

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

  @Mutation('createContentItem')
  async createContentItem(
    @Args('input') input: CreateContentItemInput,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) {
      throw new UnauthorizedException('Authentication required');
    }
    const tenantId = auth.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return this.contentItemService.create(input, tenantId);
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
