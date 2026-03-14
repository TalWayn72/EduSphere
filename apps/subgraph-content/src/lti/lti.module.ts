import { Module } from '@nestjs/common';
import { LtiResolver } from './lti.resolver';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';
import { LtiPlatformService } from './lti-platform.service';

/**
 * LtiModule wires together the LTI 1.3 controller, resolver, and service.
 *
 * Import this module into AppModule to enable the /lti/* endpoints:
 *   - POST /lti/login   — OIDC login initiation
 *   - POST /lti/launch  — JWT launch validation + deep linking
 *   - GET  /lti/jwks    — Tool public JWKS
 */
@Module({
  controllers: [LtiController],
  providers: [LtiResolver, LtiService, LtiPlatformService],
  exports: [LtiService, LtiPlatformService],
})
export class LtiModule {}
