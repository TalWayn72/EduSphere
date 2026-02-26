import { Module } from '@nestjs/common';
import { ScimTokenService } from './scim-token.service.js';
import { ScimUserService } from './scim-user.service.js';
import { ScimGroupService } from './scim-group.service.js';
import { ScimController } from './scim.controller.js';
import { ScimResolver } from './scim.resolver.js';

@Module({
  controllers: [ScimController],
  providers: [
    ScimTokenService,
    ScimUserService,
    ScimGroupService,
    ScimResolver,
  ],
  exports: [ScimTokenService],
})
export class ScimModule {}
