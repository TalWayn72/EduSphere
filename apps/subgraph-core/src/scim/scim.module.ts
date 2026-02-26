import { Module } from '@nestjs/common';
import { ScimTokenService } from './scim-token.service.js';
import { ScimUserService } from './scim-user.service.js';
import { ScimController } from './scim.controller.js';
import { ScimResolver } from './scim.resolver.js';

@Module({
  controllers: [ScimController],
  providers: [ScimTokenService, ScimUserService, ScimResolver],
  exports: [ScimTokenService],
})
export class ScimModule {}
