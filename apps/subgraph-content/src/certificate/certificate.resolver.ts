import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { CertificateService } from './certificate.service.js';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: (auth.roles[0] as TenantContext['userRole']) ?? 'STUDENT',
  };
}

@Resolver('Certificate')
export class CertificateResolver {
  constructor(private readonly certificateService: CertificateService) {}

  @Query('myCertificates')
  async getMyCertificates(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.certificateService.getMyCertificates(tenantCtx);
  }

  @Query('verifyCertificate')
  async verifyCertificate(@Args('code') code: string) {
    return this.certificateService.verifyCertificate(code);
  }
}
