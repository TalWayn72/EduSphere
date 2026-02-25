import {
  Resolver, Query, Mutation, Args, Context, ResolveField, Parent,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { SocialService } from './social.service';
import type { AuthContext } from '@edusphere/auth';

interface GqlContext {
  req: unknown;
  authContext?: AuthContext;
}

interface UserRef {
  id: string;
  tenantId?: string;
}

@Resolver('User')
export class SocialResolver {
  constructor(private readonly socialService: SocialService) {}

  @ResolveField('followersCount')
  async followersCount(
    @Parent() user: UserRef,
    @Context() ctx: GqlContext,
  ): Promise<number> {
    const tenantId = ctx.authContext?.tenantId ?? user.tenantId ?? '';
    return this.socialService.getFollowersCount(user.id, tenantId);
  }

  @ResolveField('followingCount')
  async followingCount(
    @Parent() user: UserRef,
    @Context() ctx: GqlContext,
  ): Promise<number> {
    const tenantId = ctx.authContext?.tenantId ?? user.tenantId ?? '';
    return this.socialService.getFollowingCount(user.id, tenantId);
  }

  @ResolveField('isFollowedByMe')
  async isFollowedByMe(
    @Parent() user: UserRef,
    @Context() ctx: GqlContext,
  ): Promise<boolean> {
    if (!ctx.authContext) return false;
    const tenantId = ctx.authContext.tenantId ?? '';
    return this.socialService.isFollowing(ctx.authContext.userId, user.id, tenantId);
  }

  @Query('myFollowers')
  async myFollowers(
    @Args('limit') limit: number | undefined,
    @Context() ctx: GqlContext,
  ): Promise<string[]> {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    const tenantId = ctx.authContext.tenantId ?? '';
    return this.socialService.getFollowers(ctx.authContext.userId, tenantId, limit);
  }

  @Query('myFollowing')
  async myFollowing(
    @Args('limit') limit: number | undefined,
    @Context() ctx: GqlContext,
  ): Promise<string[]> {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    const tenantId = ctx.authContext.tenantId ?? '';
    return this.socialService.getFollowing(ctx.authContext.userId, tenantId, limit);
  }

  @Mutation('followUser')
  async followUser(
    @Args('userId') userId: string,
    @Context() ctx: GqlContext,
  ): Promise<boolean> {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    const tenantId = ctx.authContext.tenantId ?? '';
    return this.socialService.followUser(ctx.authContext.userId, userId, tenantId);
  }

  @Mutation('unfollowUser')
  async unfollowUser(
    @Args('userId') userId: string,
    @Context() ctx: GqlContext,
  ): Promise<boolean> {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    const tenantId = ctx.authContext.tenantId ?? '';
    return this.socialService.unfollowUser(ctx.authContext.userId, userId, tenantId);
  }
}
