import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UserService } from './user.service';
import { UserStatsService } from './user-stats.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: any;
  authContext?: AuthContext;
}

@Resolver('User')
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly userStatsService: UserStatsService
  ) {}

  @Query('_health')
  health(): string {
    return 'ok';
  }

  @Query('user')
  async getUser(@Args('id') id: string, @Context() context: GraphQLContext) {
    return this.userService.findById(id, context.authContext);
  }

  @Query('users')
  async getUsers(
    @Args('limit') limit: number,
    @Args('offset') offset: number,
    @Context() context: GraphQLContext
  ) {
    return this.userService.findAll(limit, offset, context.authContext);
  }

  @Query('me')
  async getCurrentUser(@Context() context: GraphQLContext) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }
    return this.userService.findById(
      context.authContext.userId,
      context.authContext
    );
  }

  @Query('myStats')
  async getMyStats(@Context() context: GraphQLContext) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }
    return this.userStatsService.getMyStats(
      context.authContext.userId,
      context.authContext.tenantId || ''
    );
  }

  @Mutation('createUser')
  async createUser(
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }
    return this.userService.create(input, context.authContext);
  }

  @Mutation('updateUser')
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }
    return this.userService.update(id, input, context.authContext);
  }
}
