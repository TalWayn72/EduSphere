import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class AnnouncementsResolver {
  constructor(private readonly svc: AnnouncementsService) {}

  @Query('adminAnnouncements')
  async adminAnnouncements(
    @Args('limit') limit: number,
    @Args('offset') offset: number,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.getAdminAnnouncements(ctx.authContext.tenantId ?? '', {
      limit: limit ?? 20,
      offset: offset ?? 0,
    });
  }

  @Query('activeAnnouncements')
  async activeAnnouncements(@Context() ctx: GraphQLContext) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.getActiveAnnouncements(ctx.authContext.tenantId ?? '');
  }

  @Mutation('createAnnouncement')
  async createAnnouncement(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.create(
      ctx.authContext.tenantId ?? '',
      ctx.authContext.userId ?? '',
      input as unknown as Parameters<AnnouncementsService['create']>[2]
    );
  }

  @Mutation('updateAnnouncement')
  async updateAnnouncement(
    @Args('id') id: string,
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.update(
      id,
      input as Parameters<AnnouncementsService['update']>[1]
    );
  }

  @Mutation('deleteAnnouncement')
  async deleteAnnouncement(
    @Args('id') id: string,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.delete(id);
  }

  @Mutation('publishAnnouncement')
  async publishAnnouncement(
    @Args('id') id: string,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.publish(id);
  }
}
