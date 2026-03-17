import { Logger } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { keycloakConfig } from '@edusphere/config';
import { JWTValidator, type AuthContext } from './jwt.js';

export interface GraphQLContext {
  req: IncomingMessage & {
    headers: Record<string, string | string[] | undefined>;
  };
  authContext?: AuthContext;
}

export class AuthMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly jwtValidator: JWTValidator;

  constructor() {
    this.jwtValidator = new JWTValidator(
      keycloakConfig.url,
      keycloakConfig.realm,
      keycloakConfig.clientId
    );
    this.logger.log(`JWT Validator initialized: ${keycloakConfig.issuer}`);
  }

  async validateRequest(context: GraphQLContext): Promise<void> {
    const authHeader = context.req?.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return;
    }

    try {
      const token = this.jwtValidator.extractToken(authHeader);
      if (!token) {
        return;
      }

      const authContext = await this.jwtValidator.validate(token);

      // Fallback: use x-tenant-id header if JWT has no tenant_id claim
      if (!authContext.tenantId) {
        const tenantHeader = context.req.headers['x-tenant-id'];
        const tenantId = Array.isArray(tenantHeader)
          ? tenantHeader[0]
          : tenantHeader;
        if (tenantId) {
          authContext.tenantId = tenantId;
          this.logger.warn(
            'JWT missing tenant_id claim — using x-tenant-id header as fallback'
          );
        }
      }

      context.authContext = authContext;

      this.logger.debug(
        `Authenticated: ${authContext.email} (${authContext.roles.join(', ')}) - Tenant: ${authContext.tenantId}`
      );
    } catch (error) {
      // BUG-038 fix: invalid JWT must NOT block public resolvers.
      // The request proceeds unauthenticated; resolvers using
      // extractAuthContext() will reject it if @authenticated is required.
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[AuthMiddleware] JWT validation failed: ${reason}`
      );

      // Fallback: if gateway already validated the JWT and forwarded identity
      // headers (x-user-id, x-tenant-id, x-user-role), use those to populate
      // authContext. This ensures auth works even when subgraph JWT validation
      // fails (e.g. Keycloak JWKS endpoint temporarily unreachable).
      const userId = this.extractHeader(context, 'x-user-id');
      const tenantId = this.extractHeader(context, 'x-tenant-id');
      const role = this.extractHeader(context, 'x-user-role');
      if (userId) {
        context.authContext = {
          userId,
          email: '',
          username: '',
          roles: role ? [role as AuthContext['roles'][number]] : [],
          scopes: [],
          tenantId: tenantId ?? undefined,
          isSuperAdmin: role === 'SUPER_ADMIN',
        };
        this.logger.warn(
          `[AuthMiddleware] Using gateway-forwarded headers fallback: userId=${userId}, tenantId=${tenantId}`
        );
      }
    }
  }

  private extractHeader(
    context: GraphQLContext,
    name: string
  ): string | undefined {
    const val = context.req?.headers?.[name];
    if (Array.isArray(val)) return val[0];
    return typeof val === 'string' && val.length > 0 ? val : undefined;
  }
}

export const authMiddleware = new AuthMiddleware();
