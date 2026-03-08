import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserStatsService } from './user-stats.service';
import { UserPreferencesService } from './user-preferences.service';
import { PublicProfileService } from './public-profile.service';
import { ActivityFeedService } from './activity-feed.service';
import { InProgressCoursesService } from './in-progress-courses.service';
import { RecommendedCoursesService } from './recommended-courses.service';
import { UpdateUserPreferencesSchema } from './user.schemas';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('User')
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly userStatsService: UserStatsService,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly publicProfileService: PublicProfileService,
    private readonly activityFeedService: ActivityFeedService,
    private readonly inProgressCoursesService: InProgressCoursesService,
    private readonly recommendedCoursesService: RecommendedCoursesService
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
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.userService.findById(
      context.authContext.userId,
      context.authContext
    );
  }

  @Query('myStats')
  async getMyStats(@Context() context: GraphQLContext) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.userStatsService.getMyStats(
      context.authContext.userId,
      context.authContext.tenantId || ''
    );
  }

  @Query('publicProfile')
  async getPublicProfile(@Args('userId') userId: string) {
    return this.publicProfileService.getPublicProfile(userId);
  }

  @Query('adminUsers')
  async getAdminUsers(
    @Args('limit') limit: number,
    @Args('offset') offset: number,
    @Args('search') search: string | undefined,
    @Args('role') role: string | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    return this.userService.adminUsers(
      { limit: limit ?? 50, offset: offset ?? 0, search, role },
      context.authContext
    );
  }

  @Query('listUsers')
  async listUsers(
    @Args('input') input: { page?: number; limit?: number; search?: string; role?: string } | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    return this.userService.listUsers(input ?? {}, context.authContext);
  }

  @Mutation('createUser')
  async createUser(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.userService.create(
      input as Parameters<UserService['create']>[0],
      context.authContext
    );
  }

  @Mutation('updateUser')
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.userService.update(
      id,
      input as Parameters<UserService['update']>[1],
      context.authContext
    );
  }

  @Mutation('updateUserPreferences')
  async updateUserPreferences(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    const validated = UpdateUserPreferencesSchema.parse(input);
    return this.userPreferencesService.updatePreferences(
      context.authContext.userId,
      validated,
      context.authContext
    );
  }

  @Mutation('updateProfileVisibility')
  async updateProfileVisibility(
    @Args('isPublic') isPublic: boolean,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    return this.userPreferencesService.updateProfileVisibility(
      context.authContext.userId,
      isPublic,
      context.authContext
    );
  }

  @Mutation('deactivateUser')
  async deactivateUser(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ): Promise<boolean> {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    return this.userService.deactivateUser(id, context.authContext);
  }

  @Mutation('resetUserPassword')
  async resetUserPassword(
    @Args('userId') userId: string,
    @Context() context: GraphQLContext
  ): Promise<boolean> {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    return this.userService.resetUserPassword(userId, context.authContext);
  }

  @Mutation('suspendUser')
  async suspendUser(
    @Args('userId') userId: string,
    @Args('suspended') suspended: boolean,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    return this.userService.suspendUser(userId, suspended, context.authContext);
  }

  @Mutation('bulkImportUsers')
  async bulkImportUsers(
    @Args('csvData') csvData: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext)
      throw new UnauthorizedException('Unauthenticated');
    return this.userService.bulkImportUsers(csvData, context.authContext);
  }

  @Query('myInProgressCourses')
  async getMyInProgressCourses(
    @Args('limit') limit: number,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.inProgressCoursesService.getInProgressCourses(
      context.authContext.userId,
      context.authContext.tenantId || '',
      limit ?? 5
    );
  }

  @Query('myRecommendedCourses')
  async getMyRecommendedCourses(
    @Args('limit') limit: number,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.recommendedCoursesService.getRecommendedCourses(
      context.authContext.userId,
      context.authContext.tenantId || '',
      limit ?? 5
    );
  }

  @Query('myActivityFeed')
  async getMyActivityFeed(
    @Args('limit') limit: number,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.activityFeedService.getActivityFeed(
      context.authContext.userId,
      context.authContext.tenantId || '',
      limit ?? 10
    );
  }
}
