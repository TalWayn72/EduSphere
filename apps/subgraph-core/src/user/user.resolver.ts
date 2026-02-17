import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UserService } from './user.service';

@Resolver('User')
export class UserResolver {
  constructor(private readonly userService: UserService) {}

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
    return this.userService.create(input);
  }

  @Mutation('updateUser')
  async updateUser(@Args('id') id: string, @Args('input') input: any) {
    return this.userService.update(id, input);
  }
}
