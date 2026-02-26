import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantLanguageService } from './tenant-language.service';
import { TenantBrandingService } from './tenant-branding.service';
import { UpdateTenantLanguageSettingsSchema } from './tenant-language.schemas';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('Tenant')
export class TenantResolver {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantLanguageService: TenantLanguageService,
    private readonly tenantBrandingService: TenantBrandingService
  ) {}

  @Query('tenant')
  async getTenant(@Args('id') id: string) {
    return this.tenantService.findById(id);
  }

  @Query('tenants')
  async getTenants(
    @Args('limit') limit: number,
    @Args('offset') offset: number
  ) {
    return this.tenantService.findAll(limit, offset);
  }

  @Query('myTenantLanguageSettings')
  async getMyTenantLanguageSettings(@Context() context: GraphQLContext) {
    if (!context.authContext) {
      throw new UnauthorizedException('Unauthenticated');
    }
    return this.tenantLanguageService.getSettings(
      context.authContext.tenantId || ''
    );
  }

  @Mutation('updateTenantLanguageSettings')
  async updateTenantLanguageSettings(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new UnauthorizedException('Unauthenticated');
    }
    const validated = UpdateTenantLanguageSettingsSchema.parse(input);
    return this.tenantLanguageService.updateSettings(
      context.authContext.tenantId || '',
      validated
    );
  }

  @Query('myTenantBranding')
  async getMyTenantBranding(@Context() context: GraphQLContext) {
    if (!context.authContext) {
      throw new UnauthorizedException('Unauthenticated');
    }
    return this.tenantBrandingService.getBranding(
      context.authContext.tenantId || ''
    );
  }

  @Mutation('updateTenantBranding')
  async updateTenantBranding(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new UnauthorizedException('Unauthenticated');
    }
    return this.tenantBrandingService.updateBranding(
      context.authContext.tenantId || '',
      input as Parameters<TenantBrandingService['updateBranding']>[1]
    );
  }
}
