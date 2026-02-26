import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { CustomRoleService } from './custom-role.service.js';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class CustomRoleResolver {
  constructor(private readonly customRoleService: CustomRoleService) {}

  private tenantCtx(ctx: GraphQLContext): TenantContext {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return {
      tenantId: ctx.authContext.tenantId ?? '',
      userId: ctx.authContext.userId ?? '',
      userRole: (ctx.authContext.roles[0] ??
        'STUDENT') as TenantContext['userRole'],
    };
  }

  @Query('roles')
  async listRoles(@Context() ctx: GraphQLContext) {
    return this.customRoleService.listRoles(this.tenantCtx(ctx));
  }

  @Query('role')
  async getRole(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    return this.customRoleService.getRole(id, this.tenantCtx(ctx));
  }

  @Query('userDelegations')
  async getUserDelegations(
    @Args('userId') userId: string,
    @Context() ctx: GraphQLContext
  ) {
    return this.customRoleService.getUserDelegations(
      userId,
      this.tenantCtx(ctx)
    );
  }

  @Mutation('createRole')
  async createRole(
    @Args('input')
    input: { name: string; description?: string; permissions: string[] },
    @Context() ctx: GraphQLContext
  ) {
    return this.customRoleService.createRole(input, this.tenantCtx(ctx));
  }

  @Mutation('updateRole')
  async updateRole(
    @Args('id') id: string,
    @Args('input')
    input: { name?: string; description?: string; permissions?: string[] },
    @Context() ctx: GraphQLContext
  ) {
    return this.customRoleService.updateRole(id, input, this.tenantCtx(ctx));
  }

  @Mutation('deleteRole')
  async deleteRole(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    return this.customRoleService.deleteRole(id, this.tenantCtx(ctx));
  }

  @Mutation('delegateRole')
  async delegateRole(
    @Args('userId') userId: string,
    @Args('roleId') roleId: string,
    @Args('validUntil') validUntil: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    return this.customRoleService.delegateRole(
      userId,
      roleId,
      validUntil ?? null,
      this.tenantCtx(ctx)
    );
  }

  @Mutation('revokeDelegation')
  async revokeDelegation(
    @Args('delegationId') delegationId: string,
    @Context() ctx: GraphQLContext
  ) {
    return this.customRoleService.revokeDelegation(
      delegationId,
      this.tenantCtx(ctx)
    );
  }
}
