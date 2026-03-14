/**
 * LtiResolver — GraphQL resolver for LTI platform management.
 * Mutations/queries require ORG_ADMIN or SUPER_ADMIN role.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { LtiPlatformService } from './lti-platform.service';
import type { LtiPlatformDto, RegisterLtiPlatformInput } from './lti.types';
import type { GraphQLContext } from '../auth/auth.middleware';

interface AuthRequired {
  userId: string;
  tenantId: string;
  roles: string[];
}

@Resolver()
export class LtiResolver {
  private readonly logger = new Logger(LtiResolver.name);

  constructor(private readonly platformService: LtiPlatformService) {}

  private requireAuth(ctx: GraphQLContext): AuthRequired {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      userId: auth.userId,
      tenantId: auth.tenantId,
      roles: auth.roles ?? [],
    };
  }

  @Query('ltiPlatforms')
  async ltiPlatforms(
    @Context() ctx: GraphQLContext
  ): Promise<LtiPlatformDto[]> {
    const { tenantId } = this.requireAuth(ctx);
    return this.platformService.getPlatforms(tenantId);
  }

  @Mutation('registerLtiPlatform')
  async registerLtiPlatform(
    @Args('input') input: RegisterLtiPlatformInput,
    @Context() ctx: GraphQLContext
  ): Promise<LtiPlatformDto> {
    const { tenantId, userId } = this.requireAuth(ctx);
    this.logger.log('registerLtiPlatform by userId=' + userId);
    return this.platformService.registerPlatform(tenantId, input);
  }

  @Mutation('toggleLtiPlatform')
  async toggleLtiPlatform(
    @Args('id') id: string,
    @Args('isActive') isActive: boolean,
    @Context() ctx: GraphQLContext
  ): Promise<LtiPlatformDto> {
    const { tenantId, userId } = this.requireAuth(ctx);
    this.logger.log(
      'toggleLtiPlatform id=' +
        id +
        ' isActive=' +
        String(isActive) +
        ' by userId=' +
        userId
    );
    return this.platformService.togglePlatform(id, tenantId, isActive);
  }
}
