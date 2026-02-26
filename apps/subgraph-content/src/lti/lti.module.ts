import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { LtiResolver } from './lti.resolver';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';

@Module({
  controllers: [LtiController],
  providers: [LtiResolver, LtiService],
=======
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';

/**
 * LtiModule wires together the LTI 1.3 controller and service.
 *
 * Import this module into AppModule to enable the /lti/* endpoints:
 *   - POST /lti/login   — OIDC login initiation
 *   - POST /lti/launch  — JWT launch validation + deep linking
 *   - GET  /lti/jwks    — Tool public JWKS
 */
@Module({
  controllers: [LtiController],
  providers: [LtiService],
>>>>>>> ed645f7 (feat(lti): implement LTI 1.3 login initiation + launch validation + deep linking)
  exports: [LtiService],
})
export class LtiModule {}
