import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { SecurityService } from './security.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext { req: unknown; authContext?: AuthContext }

@Resolver()
export class SecurityResolver {
  constructor(private readonly svc: SecurityService) {}

  @Query('mySecuritySettings')
  async mySecuritySettings(@Context() ctx: GraphQLContext) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.getSettings(ctx.authContext.tenantId ?? '');
  }

  @Mutation('updateSecuritySettings')
  async updateSecuritySettings(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GraphQLContext,
  ) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.svc.updateSettings(
      ctx.authContext.tenantId ?? '',
      input as Parameters<SecurityService['updateSettings']>[1],
    );
  }
}
