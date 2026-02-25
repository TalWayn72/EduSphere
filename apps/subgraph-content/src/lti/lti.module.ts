import { Module } from '@nestjs/common';
import { LtiResolver } from './lti.resolver';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';

@Module({
  controllers: [LtiController],
  providers: [LtiResolver, LtiService],
  exports: [LtiService],
})
export class LtiModule {}
