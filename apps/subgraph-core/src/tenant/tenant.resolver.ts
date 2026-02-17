import { Resolver, Query, Args } from '@nestjs/graphql';
import { TenantService } from './tenant.service';

@Resolver('Tenant')
export class TenantResolver {
  constructor(private readonly tenantService: TenantService) {}

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
}
