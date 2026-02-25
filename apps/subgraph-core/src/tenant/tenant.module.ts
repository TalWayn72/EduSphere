import { Module } from '@nestjs/common';
import { TenantResolver } from './tenant.resolver';
import { TenantService } from './tenant.service';
import { TenantLanguageService } from './tenant-language.service';
import { TenantBrandingService } from './tenant-branding.service';

@Module({
  providers: [TenantResolver, TenantService, TenantLanguageService, TenantBrandingService],
  exports: [TenantService, TenantLanguageService, TenantBrandingService],
})
export class TenantModule {}
