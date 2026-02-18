import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// Zod Schemas for JWT Claims
// ═══════════════════════════════════════════════════════════════

export const UserRole = z.enum([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
  'STUDENT',
  'RESEARCHER',
]);

export type UserRole = z.infer<typeof UserRole>;

export const JWTClaimsSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  preferred_username: z.string(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  realm_access: z.object({
    roles: z.array(z.string()),
  }),
  tenant_id: z.string().uuid().optional(),
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
});

export type JWTClaims = z.infer<typeof JWTClaimsSchema>;

// ═══════════════════════════════════════════════════════════════
// JWT Validator
// ═══════════════════════════════════════════════════════════════

export interface AuthContext {
  userId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
  tenantId?: string;
  isSuperAdmin: boolean;
}

export class JWTValidator {
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private issuer: string;
  private audience: string;

  constructor(keycloakUrl: string, realm: string, clientId: string) {
    const jwksUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`;
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    this.issuer = `${keycloakUrl}/realms/${realm}`;
    this.audience = clientId;
  }

  async validate(token: string): Promise<AuthContext> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });

      const claims = JWTClaimsSchema.parse(payload);

      const roles = claims.realm_access.roles.filter(
        (role): role is UserRole => UserRole.safeParse(role).success
      );

      const authContext: AuthContext = {
        userId: claims.sub,
        email: claims.email,
        username: claims.preferred_username,
        firstName: claims.given_name,
        lastName: claims.family_name,
        roles,
        tenantId: claims.tenant_id,
        isSuperAdmin: roles.includes('SUPER_ADMIN'),
      };

      return authContext;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`JWT validation failed: ${error.message}`);
      }
      throw new Error('JWT validation failed');
    }
  }

  extractToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

// ═══════════════════════════════════════════════════════════════
// Authorization Helpers
// ═══════════════════════════════════════════════════════════════

export function requireRole(
  context: AuthContext | null,
  requiredRole: UserRole
): void {
  if (!context) {
    throw new Error('Unauthorized: No authentication context');
  }

  if (context.isSuperAdmin) {
    return;
  }

  if (!context.roles.includes(requiredRole)) {
    throw new Error(`Forbidden: Role ${requiredRole} required`);
  }
}

export function requireAnyRole(
  context: AuthContext | null,
  requiredRoles: UserRole[]
): void {
  if (!context) {
    throw new Error('Unauthorized: No authentication context');
  }

  if (context.isSuperAdmin) {
    return;
  }

  const hasRole = requiredRoles.some((role) => context.roles.includes(role));
  if (!hasRole) {
    throw new Error(
      `Forbidden: One of roles [${requiredRoles.join(', ')}] required`
    );
  }
}

export function requireTenantAccess(
  context: AuthContext | null,
  tenantId: string
): void {
  if (!context) {
    throw new Error('Unauthorized: No authentication context');
  }

  if (context.isSuperAdmin) {
    return;
  }

  if (context.tenantId !== tenantId) {
    throw new Error('Forbidden: Access to this tenant is not allowed');
  }
}
