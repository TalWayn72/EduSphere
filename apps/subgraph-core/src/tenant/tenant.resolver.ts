import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantLanguageService } from './tenant-language.service';
import { TenantBrandingService } from './tenant-branding.service';
import { OrgDomainService } from './org-domain.service';
import { TenantPlanService } from './tenant-plan.service';
import { UpdateTenantLanguageSettingsSchema } from './tenant-language.schemas';
import { UpdateTenantPlanSchema } from './tenant-plan.schemas';
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
    private readonly tenantBrandingService: TenantBrandingService,
    private readonly orgDomainService: OrgDomainService,
    private readonly tenantPlanService: TenantPlanService
  ) {}

  private getAuthContext(context: GraphQLContext) {
    if (!context.authContext) {
      throw new UnauthorizedException('Unauthenticated');
    }
    return context.authContext;
  }

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
    const auth = this.getAuthContext(context);
    return this.tenantLanguageService.getSettings(auth.tenantId || '');
  }

  @Query('organizationDomains')
  async getOrganizationDomains(
    @Args('orgId') orgId: string,
    @Context() context: GraphQLContext
  ) {
    const auth = this.getAuthContext(context);
    return this.orgDomainService.findByOrgId(orgId, {
      tenantId: auth.tenantId || orgId,
      userId: auth.userId,
      userRole: auth.roles[0] || 'STUDENT',
    });
  }

  @Mutation('updateTenantLanguageSettings')
  async updateTenantLanguageSettings(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    const auth = this.getAuthContext(context);
    const validated = UpdateTenantLanguageSettingsSchema.parse(input);
    return this.tenantLanguageService.updateSettings(
      auth.tenantId || '',
      validated
    );
  }

  @Query('publicBranding')
  async publicBranding(@Args('slug') slug: string) {
    if (!slug?.trim()) return null;
    return this.tenantBrandingService.getPublicBranding(slug);
  }

  @Query('brandedLoginData')
  async brandedLoginData(@Args('slug') slug: string) {
    if (!slug?.trim()) return null;
    return this.tenantBrandingService.getBrandedLoginData(slug);
  }

  @Query('myTenantBranding')
  async getMyTenantBranding(@Context() context: GraphQLContext) {
    const auth = this.getAuthContext(context);
    return this.tenantBrandingService.getBranding(auth.tenantId || '');
  }

  @Mutation('updateTenantBranding')
  async updateTenantBranding(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    const auth = this.getAuthContext(context);
    return this.tenantBrandingService.updateBranding(
      auth.tenantId || '',
      input as Parameters<TenantBrandingService['updateBranding']>[1]
    );
  }

  @Mutation('updateTenantPlan')
  async updateTenantPlan(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    const auth = this.getAuthContext(context);
    const validated = UpdateTenantPlanSchema.parse(input);
    return this.tenantPlanService.updatePlan(
      validated.tenantId,
      validated.plan,
      validated.effectiveDate,
      {
        tenantId: auth.tenantId || validated.tenantId,
        userId: auth.userId,
        userRole: auth.roles[0] || 'SUPER_ADMIN',
      }
    );
  }
}
