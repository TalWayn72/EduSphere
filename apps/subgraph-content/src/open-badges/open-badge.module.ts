/**
 * OpenBadge module — wires together service, resolver, and public HTTP controller (F-025)
 */
import { Module } from '@nestjs/common';
import { OpenBadgeService } from './open-badge.service.js';
import { OpenBadgeResolver } from './open-badge.resolver.js';
import { OpenBadgeController } from './open-badge.controller.js';
import { GraphGroundedCredentialService } from '../certificate/graph-credential.service.js';

@Module({
  controllers: [OpenBadgeController],
  providers: [OpenBadgeService, OpenBadgeResolver, GraphGroundedCredentialService],
  exports: [OpenBadgeService, GraphGroundedCredentialService],
})
export class OpenBadgeModule {}
