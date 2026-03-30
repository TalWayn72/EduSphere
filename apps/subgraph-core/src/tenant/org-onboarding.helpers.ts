/**
 * Shared auth helper and context types for OrgOnboarding resolvers.
 */
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';

export interface GqlContext {
  authContext?: AuthContext;
}

export function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
  };
}
