import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { NotificationTemplatesService } from './notification-templates.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class NotificationTemplatesResolver {
  constructor(private readonly svc: NotificationTemplatesService) {}

  private requireAuth(ctx: GraphQLContext): { tenantId: string; userId: string } {
    if (!ctx.authContext?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: ctx.authContext.tenantId ?? '',
      userId: ctx.authContext.userId,
    };
  }

  @Query('adminNotificationTemplates')
  async adminNotificationTemplates(@Context() ctx: GraphQLContext) {
    const { tenantId } = this.requireAuth(ctx);
    return this.svc.getTemplates(tenantId);
  }

  @Mutation('updateNotificationTemplate')
  async updateNotificationTemplate(
    @Args('id') id: string,
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.requireAuth(ctx);
    return this.svc.updateTemplate(
      id,
      input as Parameters<NotificationTemplatesService['updateTemplate']>[1],
      tenantId
    );
  }

  @Mutation('resetNotificationTemplate')
  async resetNotificationTemplate(
    @Args('id') id: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.requireAuth(ctx);
    return this.svc.resetTemplate(id, tenantId);
  }
}
