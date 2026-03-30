import { Module } from '@nestjs/common';
import { ScimTokenService } from './scim-token.service.js';
import { ScimUserService } from './scim-user.service.js';
import { ScimGroupService } from './scim-group.service.js';
import { ScimGroupMemberService } from './scim-group-member.service.js';
import { ScimAuthHelper } from './scim-auth.helper.js';
import { ScimController } from './scim.controller.js';
import { ScimUserController } from './scim-user.controller.js';
import { ScimGroupController } from './scim-group.controller.js';
import { ScimResolver } from './scim.resolver.js';

@Module({
  controllers: [ScimController, ScimUserController, ScimGroupController],
  providers: [
    ScimTokenService,
    ScimUserService,
    ScimGroupService,
    ScimGroupMemberService,
    ScimAuthHelper,
    ScimResolver,
  ],
  exports: [ScimTokenService],
})
export class ScimModule {}
