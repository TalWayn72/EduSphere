import { Resolver, Query, Mutation, Subscription, Args, Context } from '@nestjs/graphql';
import { UserService } from './user.service';
import { getPubSub, CHANNELS, EVENTS } from '@edusphere/redis-pubsub';
import { PubSub } from 'graphql-subscriptions';

@Resolver('User')
export class UserResolver {
  private pubsub: PubSub;

  constructor(private readonly userService: UserService) {
    this.pubsub = new PubSub();
  }

  @Query('_health')
  health(): string {
    return 'ok';
  }

  @Query('user')
  async getUser(@Args('id') id: string) {
    return this.userService.findById(id);
  }

  @Query('users')
  async getUsers(
    @Args('limit') limit: number,
    @Args('offset') offset: number
  ) {
    return this.userService.findAll(limit, offset);
  }

  @Query('me')
  async getCurrentUser(@Context() context: any) {
    const userId = context.req?.user?.id;
    if (!userId) {
      throw new Error('Unauthenticated');
    }
    return this.userService.findById(userId);
  }

  @Mutation('createUser')
  async createUser(@Args('input') input: any) {
    const user = await this.userService.create(input);

    // Publish event for subscriptions
    this.pubsub.publish(EVENTS.USER_CREATED, {
      userCreated: user,
      tenantId: input.tenantId,
    });

    return user;
  }

  @Mutation('updateUser')
  async updateUser(@Args('id') id: string, @Args('input') input: any) {
    const user = await this.userService.update(id, input);

    // Publish event for subscriptions
    this.pubsub.publish(EVENTS.USER_UPDATED, {
      userUpdated: user,
      userId: id,
      tenantId: user.tenantId,
    });

    return user;
  }

  @Subscription('userCreated', {
    filter: (payload, variables) => payload.tenantId === variables.tenantId,
  })
  userCreatedSubscription(@Args('tenantId') tenantId: string) {
    return this.pubsub.asyncIterator(EVENTS.USER_CREATED);
  }

  @Subscription('userUpdated', {
    filter: (payload, variables) =>
      payload.userId === variables.userId && payload.tenantId === variables.tenantId,
  })
  userUpdatedSubscription(
    @Args('userId') userId: string,
    @Args('tenantId') tenantId: string,
  ) {
    return this.pubsub.asyncIterator(EVENTS.USER_UPDATED);
  }
}
