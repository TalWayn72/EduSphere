import { Resolver, Query, Mutation, Args, ResolveField, Parent, ResolveReference } from '@nestjs/graphql';
import { DiscussionService } from './discussion.service';

@Resolver('Discussion')
export class DiscussionResolver {
  constructor(private readonly discussionService: DiscussionService) {}

  @Query('discussion')
  async getDiscussion(@Args('id') id: string) {
    return this.discussionService.findById(id);
  }

  @Query('discussionsByContentItem')
  async getDiscussionsByContentItem(@Args('contentItemId') contentItemId: string) {
    return this.discussionService.findByContentItem(contentItemId);
  }

  @Query('discussionsByAuthor')
  async getDiscussionsByAuthor(@Args('authorId') authorId: string) {
    return this.discussionService.findByAuthor(authorId);
  }

  @Query('discussionReplies')
  async getDiscussionReplies(@Args('parentId') parentId: string) {
    return this.discussionService.findReplies(parentId);
  }

  @Mutation('createDiscussion')
  async createDiscussion(@Args('input') input: any) {
    return this.discussionService.create(input);
  }

  @Mutation('updateDiscussion')
  async updateDiscussion(@Args('id') id: string, @Args('input') input: any) {
    return this.discussionService.update(id, input);
  }

  @Mutation('deleteDiscussion')
  async deleteDiscussion(@Args('id') id: string) {
    return this.discussionService.delete(id);
  }

  @Mutation('upvoteDiscussion')
  async upvoteDiscussion(@Args('id') id: string) {
    return this.discussionService.upvote(id);
  }

  @Mutation('replyToDiscussion')
  async replyToDiscussion(@Args('parentId') parentId: string, @Args('input') input: any) {
    return this.discussionService.reply(parentId, input);
  }

  @ResolveField('replies')
  async getReplies(@Parent() discussion: any) {
    return this.discussionService.findReplies(discussion.id);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.discussionService.findById(reference.id);
  }
}
