import { Resolver, Query, Mutation, Subscription, Args, ResolveField, Parent, ResolveReference } from '@nestjs/graphql';
import { DiscussionService } from './discussion.service';
import { PubSub } from 'graphql-subscriptions';

const DISCUSSION_CREATED = 'discussionCreated';
const DISCUSSION_UPDATED = 'discussionUpdated';
const DISCUSSION_UPVOTED = 'discussionUpvoted';

@Resolver('Discussion')
export class DiscussionResolver {
  private pubsub: PubSub;

  constructor(private readonly discussionService: DiscussionService) {
    this.pubsub = new PubSub();
  }

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
    const discussion = await this.discussionService.create(input);
    this.pubsub.publish(DISCUSSION_CREATED, { discussionCreated: discussion, courseId: input.courseId });
    return discussion;
  }

  @Mutation('updateDiscussion')
  async updateDiscussion(@Args('id') id: string, @Args('input') input: any) {
    const discussion = await this.discussionService.update(id, input);
    this.pubsub.publish(DISCUSSION_UPDATED, { discussionUpdated: discussion, discussionId: id });
    return discussion;
  }

  @Mutation('deleteDiscussion')
  async deleteDiscussion(@Args('id') id: string) {
    return this.discussionService.delete(id);
  }

  @Mutation('upvoteDiscussion')
  async upvoteDiscussion(@Args('id') id: string) {
    const discussion = await this.discussionService.upvote(id);
    this.pubsub.publish(DISCUSSION_UPVOTED, { discussionUpvoted: discussion, discussionId: id });
    return discussion;
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

  @Subscription('discussionCreated', {
    filter: (payload, variables) => payload.courseId === variables.courseId,
  })
  discussionCreatedSubscription(@Args('courseId') courseId: string) {
    return this.pubsub.asyncIterator(DISCUSSION_CREATED);
  }

  @Subscription('discussionUpdated', {
    filter: (payload, variables) => payload.discussionId === variables.discussionId,
  })
  discussionUpdatedSubscription(@Args('discussionId') discussionId: string) {
    return this.pubsub.asyncIterator(DISCUSSION_UPDATED);
  }

  @Subscription('discussionUpvoted', {
    filter: (payload, variables) => payload.discussionId === variables.discussionId,
  })
  discussionUpvotedSubscription(@Args('discussionId') discussionId: string) {
    return this.pubsub.asyncIterator(DISCUSSION_UPVOTED);
  }
}
